const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../../../../utils/functions");

class ApprenticeshipNoticeController extends Controller {
    // Private helper methods
    async #validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                noticeApprentice: {
                    select: {
                        apprenticeId: true,
                        publisherId: true
                    }
                }
            }
        });

        if (!transaction) throw createError.NotFound("Transaction not found");

        const isOwner = role === 'apprentice' 
            ? transaction.noticeApprentice.apprenticeId === userId
            : transaction.noticeApprentice.publisherId === userId;

        if (!isOwner) throw createError.Unauthorized("Not authorized to perform this action");

        return transaction;
    }

    async #validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
          throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
      }

    async #processAttachments(files, fileUploadPath, correlationType) {
        const attachments = [];
        
        // Process images
        const images = ListOfImagesFromRequest(files || [], fileUploadPath);
        for (const image of images) {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
                url: image,
                filename: path.basename(image),
                fileType: 'image',
                fileSize: fileInfo?.size?.toString() || '0',
                mimeType: fileInfo?.mimetype || 'image/jpeg',
                dimensions: { width: 0, height: 0 },
                status: 'COMPLETED',
                CorrelationType: correlationType
            });
        }
        // Process voice files
        const voiceFiles = files?.voice || [];
        if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
                const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
                const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`;
                
                try {
                    const seconds = await getAudioDurationInSeconds(voiceURL);
                    attachments.push({
                        url: voiceAddress,
                        filename,
                        fileType: 'audio',
                        fileSize: voiceFiles[0].size.toString(),
                        mimeType: voiceFiles[0].mimetype,
                        duration: getTime(seconds),
                        status: 'COMPLETED',
                        CorrelationType: correlationType
                    });
                } catch (error) {
                    console.error("Error processing audio file:", error);
                }
            }
        }
        // Process video files
        const videoFiles = files?.video || [];
         if (Array.isArray(videoFiles) && videoFiles.length > 0) {
           const { fileUploadPath } = body;
           const filename = videoFiles[0].filename;
           
           if (filename && fileUploadPath) {
             const videoAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
             const videoURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`;
             
             try {
               const seconds = await getVideoDurationInSeconds(videoURL);
               const duration = getTime(seconds);
               
               attachments.push({
                 url: videoAddress,
                 filename: filename,
                 fileType: 'video',
                 fileSize: videoFiles[0].size.toString(),
                 mimeType: videoFiles[0].mimetype,
                 duration: duration,
                 status: 'COMPLETED',
                 // Add required relations with appropriate IDs
                 noticeApprenticeId: process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID,
               });
             } catch (error) {
               console.error("Error calculating video duration:", error);
             }
           }
         }

        return attachments;
    }

    // Controller methods
  async createNewApprenticeRequest(req, res, next) {
    try {
      const { user, body, params, files } = req;
      const garageId = await this.#validateGarageOwnership(user);
      
      const data = await noticeApprenticeSchema.validateAsync(body);
      const attachments = await this.#processAttachments(
        files, 
        body.fileUploadPath,
        process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID
      );

      const result = await prisma.$transaction(async (prisma) => {
        // Create notice with attachments
        const notice = await prisma.noticeApprenticeship.create({
          data: {
            ...data,
            publisher: { connect: { id: user.id } },
            requesterGarage: { connect: { id: garageId } },
            project: { connect: { id: params.projectId } },
            attachments: { create: attachments }
          },
          include: { attachments: true }
        });

        // Create and associate share link
        const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(user)}`;
        const share = await prisma.share.create({
          data: {
            shareUrl,
            noticeApprentice: { connect: { id: notice.id } }
          }
        });

        return { notice, share };
      });

      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data: {
          message: "آگهی درخواست شاگرد با موفقیت ثبت شد",
          notice: result.notice,
          share: result.share
        }
      });

    } catch (error) {
      deleteFilesInPublicForOrders(req.files);
      next(error);
    }
  }

  async getAllNoticeApprentice(req, res, next) {
    try {
      const notices = await prisma.noticeApprenticeship.findMany({
        where: { city: req.query.city },
        include: {
          publisher: {
            select: { name: true, avatar: true }
          },
          requesterGarage: {
            select: { name: true, address: true }
          }
        }
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: { notices }
      });
    } catch (error) {
      next(error);
    }
  }

  async getOneNoticeApprenticeById(req, res, next) {
    try {
      const notice = await prisma.noticeApprenticeship.findUnique({
        where: { id: req.params.noticeApprenticeId },
        include: {
          publisher: true,
          requesterGarage: true,
          attachments: true,
          share: true
        }
      });

      if (!notice) {
        throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
      }

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: { notice }
      });
    } catch (error) {
      next(error);
    }
  }

  async removeApprenticeRequestById(req, res, next) {
    try {
      const { noticeApprenticeId } = req.params;
      
      const notice = await prisma.noticeApprenticeship.findUnique({
        where: { id: noticeApprenticeId },
        select: { publisherId: true }
      });

      if (!notice) {
        throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
      }

      if (notice.publisherId !== req.user.id) {
        throw createError(HttpStatus.FORBIDDEN, "شما مجاز به حذف این آگهی نیستید");
      }

      await prisma.noticeApprenticeship.delete({
        where: { id: noticeApprenticeId }
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: { message: "آگهی با موفقیت حذف شد" }
      });
    } catch (error) {
      next(error);
    }
  }

  async editApprenticeRequestsById(req, res, next) {
    try {
      const { noticeApprenticeId } = req.params;
      const data = await UpdateApprenticeRequestSchema.validateAsync(req.body);
      
      // اضافه کردن validationSchema برای attachmentsToDelete
      const attachmentsToDelete = Array.isArray(req.body.attachmentsToDelete) 
        ? req.body.attachmentsToDelete 
        : [];
  
      const notice = await prisma.noticeApprenticeship.findUnique({
        where: { id: noticeApprenticeId },
        include: { attachments: true }
      });
  
      if (!notice) {
        throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
      }
  
      if (notice.publisherId !== req.user.id) {
        throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش این آگهی نیستید");
      }
  
      // پردازش فایل‌های جدید
      const newAttachments = await this.#processAttachments(
        req.files,
        req.body.fileUploadPath,
        process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID
      );
  
      const updateData = copyObject(data);
      deleteInvalidPropertyInObject(updateData, [
        "id", "publisherId", "createdAt", "updatedAt",
        "bookmarks", "conversation", "transaction",
        "milestones", "reviews", "transactionsActivityLogs", "share"
      ]);
  
      // بروزرسانی با حذف انتخابی فایل‌ها
      const updatedNotice = await prisma.noticeApprenticeship.update({
        where: { id: noticeApprenticeId },
        data: {
          ...updateData,
          attachments: {
            // حذف فقط فایل‌های انتخاب شده
            deleteMany: attachmentsToDelete.length > 0 
              ? { id: { in: attachmentsToDelete } }
              : undefined,
            // اضافه کردن فایل‌های جدید
            create: newAttachments
          }
        }
      });
  
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          message: "آگهی با موفقیت بروزرسانی شد",
          notice: updatedNotice
        }
      });
    } catch (error) {
      deleteFilesInPublicForOrders(req.files);
      next(error);
    }
  }

  // Bookmark handling
  async toggleBookmark(req, res, next) {
    try {
      const { noticeApprenticeId } = req.params;
      const userId = req.user.id;

      const bookmark = await prisma.bookmark.findFirst({
        where: {
          userId,
          noticeApprenticeshipId: noticeApprenticeId
        }
      });

      if (bookmark) {
        await prisma.bookmark.delete({
          where: { id: bookmark.id }
        });
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data: { message: "آگهی از علاقه‌مندی‌های شما حذف شد" }
        });
      }

      await prisma.bookmark.create({
        data: {
          userId,
          noticeApprenticeshipId: noticeApprenticeId
        }
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: { message: "آگهی به علاقه‌مندی‌های شما اضافه شد" }
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllGarageNoticeApprentices(req, res, next) {
    try {
      //همه ی درخواست های شاگرد که گاراژ ثبت کرده
      const garageId = await this.#validateGarageOwnership(req.user);
      const { page = 1, limit = 10 } = req.query;

      const where = {
        publisherId: req.user.id,
        requesterGarageId: garageId
      };

      const [notices, total] = await prisma.$transaction([
        prisma.noticeApprenticeship.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            apprentice: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            project: {
              select: {
                title: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.noticeApprenticeship.count({ where })
      ]);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          notices,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllApprenticeRequestsToItself(req, res, next) {
    try {
      // همه ی درخواست های شاگرد که شاگرد ثبت کرده
      const { id: apprenticeId } = req.user;
      const { page = 1, limit = 10, status } = req.query;

      const where = { apprenticeId };
      if (status) where.status = status;

      const [requests, total] = await prisma.$transaction([
        prisma.shagerdReqsForApprenticeCoWork.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            noticeApprenticeship: {
              include: {
                requesterGarage: {
                  select: {
                    name: true,
                    address: true,
                    rating: true
                  }
                },
                project: {
                  select: {
                    title: true,
                    status: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.shagerdReqsForApprenticeCoWork.count({ where })
      ]);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          requests,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getApprenticeAllActiveApprenticeNoticeApps(req, res, next) {
    try {
      // همه پروژه های همکاری شاگرد که شاگرد درشون مشغوله
      const { id: apprenticeId } = req.user;
      const { page = 1, limit = 10 } = req.query;

      const where = {
        apprenticeId,
        status: 'IN_PROGRESS',
        isAvailable: false
      };

      const [activeNotices, total] = await prisma.$transaction([
        prisma.noticeApprenticeship.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            requesterGarage: {
              select: {
                name: true,
                address: true,
                rating: true
              }
            },
            project: {
              select: {
                title: true,
                status: true,
                startedAt: true,
                expectedDuration: true
              }
            }
          },
          orderBy: { startedAt: 'desc' }
        }),
        prisma.noticeApprenticeship.count({ where })
      ]);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          activeNotices,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getGarageAllActiveApprenticeNoticeApps(req, res, next) {
    try {
      const garageId = await this.#validateGarageOwnership(req.user);
      const { page = 1, limit = 10 } = req.query;

      const where = {
        publisherId: req.user.id,
        requesterGarageId: garageId,
        status: 'IN_PROGRESS',
        isAvailable: true
      };

      const [activeNotices, total] = await prisma.$transaction([
        prisma.noticeApprenticeship.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            apprentice: {
              select: {
                id: true,
                name: true,
                avatar: true,
                phone: true,
                rating: true
              }
            },
            project: {
              select: {
                title: true,
                status: true,
                startedAt: true,
                expectedDuration: true
              }
            },
            milestones: {
              where: { status: 'IN_PROGRESS' },
              select: {
                title: true,
                dueDate: true
              }
            }
          },
          orderBy: { startedAt: 'desc' }
        }),
        prisma.noticeApprenticeship.count({ where })
      ]);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          activeNotices,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async shareApprenticeRequest(req, res, next) {
    try {
      const { noticeApprenticeId } = req.params;
      
      const notice = await prisma.noticeApprenticeship.findUnique({
        where: { id: noticeApprenticeId },
        select: {
          share: {
            select: {
              id: true,
              shareUrl: true,
              createdAt: true
            }
          },
          title: true,
          status: true,
          isAvailable: true
        }
      });

      if (!notice) {
        throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
      }

      if (!notice.isAvailable) {
        throw createError(HttpStatus.BAD_REQUEST, "این آگهی در حال حاضر قابل اشتراک‌گذاری نیست");
      }

      // If no share link exists, create one
      if (!notice.share?.length) {
        const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(req.user)}`;
        const share = await prisma.share.create({
          data: {
            shareUrl,
            noticeApprentice: { connect: { id: noticeApprenticeId } }
          }
        });

        notice.share = [share];
      }

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          share: notice.share[0]
        }
      });
    } catch (error) {
      next(error);
    }
  }

    // Public methods
    async addCoworkReqForNoticeApprentice(req, res, next) {
      try {
        const { user, params } = req;
        const { noticeApprenticeId } = params;
        
        // تعیین نوع درخواست و مقادیر مورد نیاز
        const isApprenticeRequest = !!user.apprenticeAt;
        const garageId = isApprenticeRequest ? user.apprenticeAt?.id : user.ownedGarage?.id;
        const apprenticeId = isApprenticeRequest ? user.id : params.apprenticeId;
        
        // انتخاب مدل مناسب براساس نوع درخواست
        const prismaModel = isApprenticeRequest 
          ? prisma.shagerdReqsForApprenticeCoWork 
          : prisma.garageReqsForApprenticeCoWork;
    
        const noticeApprenticeAppReqs = await prismaModel.create({
          data: {
            garage: {
              connect: {
                id: garageId,
              },
            },
            apprentice: {
              connect: {
                id: apprenticeId,
              },
            },
            noticeApprentice: {
              connect: {
                id: noticeApprenticeId,
              },
            },
          },
        });
    
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data: {
            noticeApprenticeAppReqs
          }
        });
      } catch (error) {
        console.error("Error creating apprentice notice request:", error);
        next(error);
      }
    }

    async showCoworkRequestsForRequesterGarage(req, res, next) {
        try {
            const { user } = req;
            const { ownedGarage } = user;

            if (!ownedGarage?.id) throw createError.Unauthorized("Only garage owners can view requests");

            const requests = await prisma.noticeApprenticeship.findMany({
                where: { requesterGarageId: ownedGarage.id },
                select: {
                    shagerdReqsForApprenticeCoWork: true,
                    garageReqsForApprenticeCoWork: true
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { requests }
            });
        } catch (error) {
            next(error);
        }
    }

    async addApprenticeToRequest(req, res, next) {
        try {
            const { user, params, body } = req;
            const { apprenticeId, noticeApprenticeId } = params;
            const { dueDate, description, amount } = body;
            const { ownedGarage } = user;

            if (!ownedGarage?.id) throw createError.Unauthorized("Only garage owners can add apprentices");

            const result = await prisma.$transaction(async (prisma) => {
                // Update apprenticeship notice
                const notice = await prisma.noticeApprenticeship.update({
                    where: { id: noticeApprenticeId },
                    data: {
                        apprenticeId,
                        milestones: {
                            create: {
                                dueDate,
                                description,
                                payment: { create: { amount } }
                            }
                        }
                    }
                });

                // Create transaction
                const transaction = await prisma.transaction.create({
                    data: {
                        amount: notice.budget,
                        project: { connect: { id: notice.projectId } },
                        noticeApprentice: { connect: { id: noticeApprenticeId } },
                        transactionsActivityLog: {
                            create: {
                                action: "ترنزاکشن درخواست شاگرد ایجاد شد",
                                project: { connect: { id: notice.projectId } },
                                noticeApprentice: { connect: { id: noticeApprenticeId } }
                            }
                        }
                    }
                });

                return { notice, transaction };
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شاگرد موردنظر به پروژه افزوده شد",
                    result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisApprenticeFromApprenticeRequest(req, res, next){
        try {
            const {user, params} = req;
            const { ownedGarage } = user;
            const garageId = ownedGarage?.id;
            if(!garageId) throw createError.Unauthorized;
            const { noticeApprenticeId, apprenticeId } = params;

            const addApprentice = await prisma.noticeApprenticeship.update({
                where: {
                    id: noticeApprenticeId,
                },
                data: {
                    apprentice: {
                        disconnect: {
                          id: apprenticeId,
                        },
                    },
                },
            });
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message:
                    "شاگرد موردنظر از پروژه حذف شد"
                }
              });
        } catch (error) {
            console.error("Error showing all apprentice notice requests:", error);
            next(error)
        }
    }

    async apprenticeRefusingFromThisNoticeApprenticeship(req, res, next){
     try {
      const { params, user } = req;
      const { noticeApprenticeId } = params;
      const { id: apprenticeId } = user;
      const noticeApprentice = await this.findApprenticeRequestById(noticeApprenticeId)
      // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
      if (!noticeApprentice.apprenticeId.equals(apprenticeId)) {
        throw createError.NotAcceptable("ویرایش ترنزاکشتن فقط برای طرفین آن مجاز است");
      };

      const refuseRequest = await prisma.noticeApprenticeship.update({
        where: {
          id: noticeApprenticeId,
        },
        data: {
          apprentice: {
            disconnect: {
              id: apprenticeId,
            },
          },
        },
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
            message:
            "شما از این همکاری با موفقیت استعفا دادید "
              }
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async confirmTransactionCompletion(req, res, next) {
        try {
            const { params, user } = req;
            const { transactionId } = params;
            const { id: userId } = user;
            const role = user.apprenticeAt ? 'apprentice' : 'garageOwner';

            await this.#validateTransactionOwnership(transactionId, userId, role);

            const updateData = role === 'apprentice' 
                ? { providerConfirmedCompletion: true, providerConfirmedPayment: true }
                : { requesterConfirmedCompletion: true, requesterConfirmedPayment: true };

            await prisma.transaction.update({
                where: { id: transactionId },
                data: updateData
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "این همکاری از سمت شما با موفقیت پایان یافت" }
            });
        } catch (error) {
            next(error);
        }
    }

    async createComplaint(req, res, next) {
        try {
          const { params, user, body, files } = req;
          const { transactionId } = params;
          const { id: authorId, role } = user; // فرض می‌کنیم role در user وجود دارد
          const { description, fileUploadPath } = body;
          
          
          const attachments = await this.#processAttachments(files, body.fileUploadPath, 'AUTHOR');

          // پیدا کردن targetId بر اساس نقش کاربر
          const isGarage = role === 'GARAGE'; // یا هر منطق دیگری که نقش را مشخص می‌کند
          
          const transaction = await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },
            select: {
              noticeApprentice: {
                select: isGarage ? {
                  apprentice: {
                    select: {
                      id: true,
                    },
                  },
                } : {
                  requesterGarage: {
                    select: {
                      garageOwner: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });
      
          // استخراج targetId از نتیجه query
          const targetId = isGarage 
            ? transaction.noticeApprentice.apprentice.id
            : transaction.noticeApprentice.requesterGarage.garageOwner.id;
      
          // ایجاد شکایت
          const createComplaint = await prisma.complaint.create({
            data: {
              transaction: {
                connect: {
                  id: transactionId,
                },
              },
              author: {
                connect: {
                  id: authorId,
                },
              },
              target: {
                connect: {
                  id: targetId
                },
              },
              description: description,
              evidence: {
                create: attachments,
              },
            },
            include: {
              attachments: true
            },
          });
      
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
              message: "شکایت شما از طرف همکاری ثبت شد برای بررسی و حصول نتیجه صبور باشید"
            }
          });
        } catch (error) {
          console.error("Error creating complaint:", error);
          next(error);
        }
    }

    async removeAndRegretComplaintByrequester(req, res, next){
      try {
        const { params, user } = req;
        const { complaintId } = params;
        const { id: userId } = user;

        // پیدا کردن شکایت موردنظر
        const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId },
            include: {
                transaction: true
            }
        });

        // بررسی وجود شکایت
        if (!complaint) {
            throw new NotFoundException('شکایت مورد نظر یافت نشد');
        }

        // بررسی اینکه آیا کاربر درخواست دهنده همان ثبت کننده شکایت است
        if (complaint.authorId !== userId) {
            throw new ForbiddenException('شما مجاز به لغو این شکایت نیستید');
        }

        // بررسی وضعیت شکایت
        if (complaint.status !== 'PENDING') {
            throw new BadRequestException('فقط شکایت‌های در حال بررسی قابل لغو هستند');
        }

        // ایجاد لاگ فعالیت
        await prisma.transactionsActivityLog.create({
            data: {
                transaction: {
                    connect: { id: complaint.transactionId }
                },
                complaint: {
                    connect: { id: complaintId }
                },
                activityType: 'COMPLAINT_CANCELLED',
                description: 'شکایت توسط ثبت کننده لغو شد',
                performedById: userId
            }
        });

        // حذف شکایت
        await prisma.complaint.delete({
            where: { id: complaintId }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "شکایت شما با موفقیت لغو شد"
            }
        });

    } catch (error) {
        console.error("Error cancelling complaint:", error);
        next(error);
    }
    }

    async respondToComplaint(req, res, next) {
        try {
            const { params, user, body, files } = req;
            const { complaintId } = params;
            const { id: responderId } = user;
            const { response } = body;

            const complaint = await prisma.complaint.findUnique({
                where: { id: complaintId }
            });

            if (!complaint) throw createError.NotFound("Complaint not found");
            if (responderId !== complaint.targetId) throw createError.Unauthorized("Only the complaint target can respond");

            const attachments = await this.#processAttachments(files, body.fileUploadPath, 'TARGET');

            const updatedComplaint = await prisma.complaint.update({
                where: { id: complaintId },
                data: {
                    response,
                    evidence: { create: attachments }
                },
                include: { evidence: true }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما به شکایت ثبت شد",
                    complaint: updatedComplaint
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async addReviewForApprenticeRequest(req, res, next) {
        try {
          const { params, body, user } = req;
          const { noticeApprenticeId } = params;
          const { comment, rating, projectId, targetId, apprenticeId } = body;
          const { id: authorId, ownedGarage } = user;
          
          // تعیین نوع کاربر و اطلاعات مربوطه
          const isGarageOwner = !!ownedGarage;
          const garageId = ownedGarage?.id;
          const finalTargetId = isGarageOwner ? apprenticeId : targetId;
      
          // ساخت آبجکت پایه برای عملیات
          const baseReviewData = {
            noticeApprentice: {
              connect: {
                id: noticeApprenticeId,
              },
            },
            project: {
              connect: {
                id: projectId,
              },
            },
            target: {
              connect: {
                id: finalTargetId,
              },
            },
            author: {
              connect: {
                id: authorId,
              },
            },
            response: comment,
            rating: rating,
          };
      
          // اضافه کردن اطلاعات گاراژ در صورت نیاز
          if (isGarageOwner) {
            baseReviewData.garage = {
              connect: {
                id: garageId,
              },
            };
          }
      
          const addReview = await prisma.review.upsert({
            where: {
              noticeApprenticeId: noticeApprenticeId,
            },
            create: baseReviewData,
            update: {
              ...(isGarageOwner && {
                garage: {
                  connect: {
                    id: garageId,
                  },
                },
              }),
              response: comment,
              rating: rating,
            },
          });
      
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
              message: "باتشکر...نظر و امتیاز شما برای این همکاری ثبت شد"
            }
          });
        } catch (error) {
          console.error("Error adding review for apprentice request:", error);
          next(error);
        }
    }

       // ایجاد اتاق گفتگو برای تراکنش
    async createTransactionRoom(req, res, next) {
      try {
          const { params, user } = req;
          const { transactionId } = params;
          const { id: userId } = user;

          // بررسی وجود تراکنش و دسترسی کاربر
          const transaction = await prisma.transaction.findUnique({
              where: { id: transactionId },
              include: {
                  project: {
                      select: {
                          requesterId: true,
                          providerId: true
                      }
                  },
                  conversation: true
              }
          });

          if (!transaction) {
              throw createError.NotFound("تراکنش مورد نظر یافت نشد");
          }

          // بررسی اینکه آیا کاربر جزو طرفین تراکنش است
          if (userId !== transaction.project.requesterId && userId !== transaction.project.providerId) {
              throw createError.Forbidden("شما مجاز به ایجاد اتاق گفتگو برای این تراکنش نیستید");
          }

          // بررسی عدم وجود اتاق گفتگوی قبلی
          if (transaction.conversation) {
              throw createError.BadRequest("اتاق گفتگو قبلاً برای این تراکنش ایجاد شده است");
          }

          // ایجاد اتاق گفتگو
          const conversation = await prisma.$transaction(async (prismaClient) => {
              // ایجاد conversation
              const newConversation = await prismaClient.conversation.create({
                  data: {
                      type: 'TRANSACTION',
                      name: `تراکنش ${transaction.id}`,
                      transaction: {
                          connect: { id: transactionId }
                      }
                  }
              });

              // اضافه کردن شرکت‌کنندگان
              const participants = await Promise.all([
                  prismaClient.conversationParticipant.create({
                      data: {
                          conversationId: newConversation.id,
                          userId: transaction.project.requesterId,
                          role: 'MEMBER'
                      }
                  }),
                  prismaClient.conversationParticipant.create({
                      data: {
                          conversationId: newConversation.id,
                          userId: transaction.project.providerId,
                          role: 'MEMBER'
                      }
                  })
              ]);

              // ایجاد پیام سیستمی خوش‌آمدگویی
              await prismaClient.message.create({
                  data: {
                      conversationId: newConversation.id,
                      senderId: participants[0].id, // استفاده از اولین شرکت‌کننده به عنوان فرستنده
                      type: 'SYSTEM',
                      content: 'به اتاق گفتگوی تراکنش خوش آمدید. شما می‌توانید در اینجا درباره جزئیات همکاری گفتگو کنید.'
                  }
              });

              return newConversation;
          });

          return res.status(HttpStatus.CREATED).json({
              statusCode: HttpStatus.CREATED,
              data: {
                  message: "اتاق گفتگو با موفقیت ایجاد شد",
                  conversationId: conversation.id
              }
          });

      } catch (error) {
          next(error);
      }
    }

    // ارسال پیام در اتاق گفتگو
    async sendMessage(req, res, next) {
        try {
            const { params, user, body, files } = req;
            const { conversationId } = params;
            const { id: userId } = user;
            const { content } = body;

            // بررسی وجود مکالمه و دسترسی کاربر
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    participants: {
                        some: {
                            userId: userId,
                            isActive: true
                        }
                    }
                },
                include: {
                    participants: {
                        where: {
                            userId: userId
                        }
                    }
                }
            });

            if (!conversation) {
                throw createError.NotFound("مکالمه مورد نظر یافت نشد یا شما به آن دسترسی ندارید");
            }

            // پردازش فایل‌های پیوست
            let attachments = [];
            if (files && files.length > 0) {
                attachments = await this.#processAttachments(files, body.fileUploadPath);
            }

            // ایجاد پیام
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderId: conversation.participants[0].id,
                    content,
                    type: 'TEXT',
                    attachments: {
                        create: attachments
                    }
                },
                include: {
                    attachments: true,
                    sender: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            // آپدیت زمان آخرین پیام مکالمه
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پیام با موفقیت ارسال شد",
                    messageData: message
                }
            });

        } catch (error) {
            next(error);
        }
    }

    // دریافت پیام‌های مکالمه
    async getMessages(req, res, next) {
        try {
            const { params, user, query } = req;
            const { conversationId } = params;
            const { id: userId } = user;
            const { page = 1, limit = 20 } = query;

            // بررسی دسترسی کاربر به مکالمه
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    participants: {
                        some: {
                            userId: userId,
                            isActive: true
                        }
                    }
                }
            });

            if (!conversation) {
                throw createError.NotFound("مکالمه مورد نظر یافت نشد یا شما به آن دسترسی ندارید");
            }

            // دریافت پیام‌ها با پیجینیشن
            const skip = (page - 1) * limit;
            const messages = await prisma.message.findMany({
                where: {
                    conversationId,
                    deletedAt: null
                },
                include: {
                    attachments: true,
                    sender: {
                        include: {
                            user: true
                        }
                    },
                    reactions: true,
                    readReceipts: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limit)
            });

            // دریافت تعداد کل پیام‌ها برای پیجینیشن
            const totalMessages = await prisma.message.count({
                where: {
                    conversationId,
                    deletedAt: null
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    messages,
                    pagination: {
                        currentPage: Number(page),
                        totalPages: Math.ceil(totalMessages / limit),
                        totalMessages,
                        limit: Number(limit)
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    }

    // دریافت تمام اتاق‌های گفتگوی کاربر
    async getUserConversations(req, res, next) {
      try {
          const { user, query } = req;
          const { id: userId } = user;
          const { page = 1, limit = 10, status } = query;

          const skip = (page - 1) * limit;
          
          // ساخت شرط‌های فیلتر
          const where = {
              type: 'TRANSACTION',
              participants: {
                  some: {
                      userId: userId,
                      isActive: true
                  }
              }
          };

          // اگر فیلتر وضعیت تراکنش درخواست شده باشد
          if (status) {
              where.transaction = {
                  status
              };
          }

          // دریافت مکالمات با اطلاعات آخرین پیام و طرف مقابل
          const conversations = await prisma.conversation.findMany({
              where,
              include: {
                  transaction: {
                      include: {
                          project: {
                              include: {
                                  requester: {
                                      select: {
                                          id: true,
                                          name: true,
                                          avatar: true
                                      }
                                  },
                                  provider: {
                                      select: {
                                          id: true,
                                          name: true,
                                          avatar: true
                                      }
                                  }
                              }
                          }
                      }
                  },
                  participants: {
                      where: {
                          isActive: true
                      },
                      include: {
                          user: {
                              select: {
                                  id: true,
                                  name: true,
                                  avatar: true
                              }
                          }
                      }
                  },
                  messages: {
                      orderBy: {
                          createdAt: 'desc'
                      },
                      take: 1,
                      include: {
                          attachments: true
                      }
                  }
              },
              orderBy: {
                  lastMessageAt: 'desc'
              },
              skip,
              take: Number(limit)
          });

          // دریافت تعداد کل برای پیجینیشن
          const totalConversations = await prisma.conversation.count({ where });

          // پردازش داده‌ها برای فرمت مناسب‌تر
          const processedConversations = conversations.map(conv => {
              const otherParticipant = conv.participants.find(p => p.userId !== userId)?.user;
              const lastMessage = conv.messages[0];

              return {
                  id: conv.id,
                  transactionId: conv.transaction.id,
                  transactionStatus: conv.transaction.status,
                  name: conv.name,
                  otherParty: otherParticipant,
                  lastMessage: lastMessage ? {
                      content: lastMessage.content,
                      type: lastMessage.type,
                      createdAt: lastMessage.createdAt,
                      hasAttachments: lastMessage.attachments.length > 0
                  } : null,
                  unreadCount: 0, // این مقدار باید محاسبه شود
                  lastMessageAt: conv.lastMessageAt
              };
          });

          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  conversations: processedConversations,
                  pagination: {
                      currentPage: Number(page),
                      totalPages: Math.ceil(totalConversations / limit),
                      totalConversations,
                      limit: Number(limit)
                  }
              }
          });
      } catch (error) {
          next(error);
      }
    }

    // علامت‌گذاری پیام‌ها به عنوان خوانده شده
    async markMessagesAsRead(req, res, next) {
        try {
            const { params, user } = req;
            const { conversationId } = params;
            const { id: userId } = user;

            // پیدا کردن آخرین پیام‌های خوانده نشده
            const unreadMessages = await prisma.message.findMany({
                where: {
                    conversationId,
                    sender: {
                        user: {
                            id: {
                                not: userId
                            }
                        }
                    },
                    readReceipts: {
                        none: {
                            userId
                        }
                    }
                }
            });

            if (unreadMessages.length === 0) {
                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    data: {
                        message: "پیام ناخوانده‌ای وجود ندارد"
                    }
                });
            }

            // ایجاد رسید خواندن برای تمام پیام‌ها
            await prisma.$transaction(
                unreadMessages.map(message =>
                    prisma.messageReadReceipt.create({
                        data: {
                            messageId: message.id,
                            userId: userId
                        }
                    })
                )
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پیام‌ها به عنوان خوانده شده علامت‌گذاری شدند",
                    count: unreadMessages.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت اطلاعات پایه گفتگو
    async getConversationDetails(req, res, next) {
        try {
            const { params, user } = req;
            const { conversationId } = params;
            const { id: userId } = user;

            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'TRANSACTION',
                    participants: {
                        some: {
                            userId,
                            isActive: true
                        }
                    }
                },
                include: {
                    transaction: {
                        include: {
                            project: {
                                include: {
                                    requester: {
                                        select: {
                                            id: true,
                                            name: true,
                                            avatar: true
                                        }
                                    },
                                    provider: {
                                        select: {
                                            id: true,
                                            name: true,
                                            avatar: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    avatar: true
                                }
                            }
                        }
                    }
                }
            });

            if (!conversation) {
                throw createError.NotFound("گفتگوی مورد نظر یافت نشد");
            }

            // محاسبه تعداد پیام‌های ناخوانده
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId,
                    sender: {
                        user: {
                            id: {
                                not: userId
                            }
                        }
                    },
                    readReceipts: {
                        none: {
                            userId
                        }
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    conversation: {
                        id: conversation.id,
                        name: conversation.name,
                        type: conversation.type,
                        transaction: {
                            id: conversation.transaction.id,
                            status: conversation.transaction.status,
                            project: conversation.transaction.project
                        },
                        participants: conversation.participants.map(p => ({
                            id: p.user.id,
                            name: p.user.name,
                            avatar: p.user.avatar,
                            role: p.role,
                            lastReadAt: p.lastReadAt
                        })),
                        unreadCount,
                        createdAt: conversation.createdAt,
                        lastMessageAt: conversation.lastMessageAt
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
    
}

module.exports = {
    ApprenticeshipNoticeController: new ApprenticeshipNoticeController()
};
