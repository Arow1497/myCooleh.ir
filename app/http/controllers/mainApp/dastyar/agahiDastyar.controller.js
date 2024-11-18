const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../../../../utils/functions");

class DastyarNoticeController extends Controller {
    // Private helper methods
    async #validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                noticeDastyar: {
                    select: {
                        mechanicId: true,
                        publisherId: true
                    }
                }
            }
        });

        if (!transaction) throw createError.NotFound("Transaction not found");

        const isOwner = role === 'mechanic' 
            ? transaction.noticeDastyar.mechanicId === userId
            : transaction.noticeDastyar.publisherId === userId;

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
                 noticeDastyarId: process.env.DEFAULT_NOTICEDASTYAR_ID,
               });
             } catch (error) {
               console.error("Error calculating video duration:", error);
             }
           }
         }

        return attachments;
    }

    // Controller methods
  async createNewDastyarRequest(req, res, next) {
    try {
      const { user, body, params, files } = req;
      const garageId = await this.#validateGarageOwnership(user);
      
      const data = await noticeDastyarSchema.validateAsync(body);
      const attachments = await this.#processAttachments(
        files, 
        body.fileUploadPath,
        process.env.DEFAULT_NOTICEDASTYAR_ID
      );

      const result = await prisma.$transaction(async (prisma) => {
        // Create notice with attachments
        const notice = await prisma.noticeDastyar.create({
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
            noticeDastyar: { connect: { id: notice.id } }
          }
        });

        return { notice, share };
      });

      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data: {
          message: "آگهی درخواست مکانیک با موفقیت ثبت شد",
          notice: result.notice,
          share: result.share
        }
      });

    } catch (error) {
      deleteFilesInPublicForOrders(req.files);
      next(error);
    }
  }

  async getAllNoticeDastyar(req, res, next) {
    try {
      const notices = await prisma.noticeDastyar.findMany({
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

  async getOneNoticeDastyarById(req, res, next) {
    try {
      const notice = await prisma.noticeDastyar.findUnique({
        where: { id: req.params.noticeDastyarId },
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

  async removeDastyarRequestById(req, res, next) {
    try {
      const { noticeDastyarId } = req.params;
      
      const notice = await prisma.noticeDastyar.findUnique({
        where: { id: noticeDastyarId },
        select: { publisherId: true }
      });

      if (!notice) {
        throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
      }

      if (notice.publisherId !== req.user.id) {
        throw createError(HttpStatus.FORBIDDEN, "شما مجاز به حذف این آگهی نیستید");
      }

      await prisma.noticeDastyar.delete({
        where: { id: noticeDastyarId }
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: { message: "آگهی با موفقیت حذف شد" }
      });
    } catch (error) {
      next(error);
    }
  }

  async editDastyarRequestsById(req, res, next) {
    try {
      const { noticeDastyarId } = req.params;
      const data = await UpdateDastyarRequestSchema.validateAsync(req.body);
      
      // اضافه کردن validationSchema برای attachmentsToDelete
      const attachmentsToDelete = Array.isArray(req.body.attachmentsToDelete) 
        ? req.body.attachmentsToDelete 
        : [];
  
      const notice = await prisma.noticeDastyar.findUnique({
        where: { id: noticeDastyarId },
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
        process.env.DEFAULT_NOTICEDASTYAR_ID
      );
  
      const updateData = copyObject(data);
      deleteInvalidPropertyInObject(updateData, [
        "id", "publisherId", "createdAt", "updatedAt",
        "bookmarks", "conversation", "transaction",
        "milestones", "reviews", "transactionsActivityLogs", "share"
      ]);
  
      // بروزرسانی با حذف انتخابی فایل‌ها
      const updatedNotice = await prisma.noticeDastyar.update({
        where: { id: noticeDastyarId },
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
      const { noticeDastyarId } = req.params;
      const userId = req.user.id;

      const bookmark = await prisma.bookmark.findFirst({
        where: {
          userId,
          noticeDastyarId: noticeDastyarId
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
          noticeDastyarId: noticeDastyarId
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

  // Query methods with proper pagination
  async getGarageDastyarRequests(req, res, next) {
    try {
      const garageId = await this.#validateGarageOwnership(req.user);
      const { page = 1, limit = 10 } = req.query;
      
      const [notices, total] = await prisma.$transaction([
        prisma.noticeDastyar.findMany({
          where: { requesterGarageId: garageId },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            mechanic: true,
            attachments: true
          }
        }),
        prisma.noticeDastyar.count({
          where: { requesterGarageId: garageId }
        })
      ]);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          notices,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
            perPage: limit
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllOfGarageDastyarRequests(req, res, next) {
    try {
      const garageId = await this.#validateGarageOwnership(req.user);
      const { page = 1, limit = 10, status } = req.query;
      
      const where = { requesterGarageId: garageId };
      if (status) where.status = status;

      const [notices, total] = await prisma.$transaction([
        prisma.noticeDastyar.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            mechanic: {
              select: {
                id: true,
                name: true,
                avatar: true,
                phone: true
              }
            },
            attachments: true,
            project: {
              select: {
                title: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.noticeDastyar.count({ where })
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

  async getAllGarageNoticeDastyars(req, res, next) {
    try {
      const garageId = await this.#validateGarageOwnership(req.user);
      const { page = 1, limit = 10 } = req.query;

      const where = {
        publisherId: req.user.id,
        requesterGarageId: garageId
      };

      const [notices, total] = await prisma.$transaction([
        prisma.noticeDastyar.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            mechanic: {
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
        prisma.noticeDastyar.count({ where })
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

  async getAllMechanicNoticeDastyarRequests(req, res, next) {
    try {
      const { id: mechanicId } = req.user;
      const { page = 1, limit = 10, status } = req.query;

      const where = { mechanicId };
      if (status) where.status = status;

      const [requests, total] = await prisma.$transaction([
        prisma.shagerdReqsForMechanicCoWork.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            noticeDastyar: {
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
        prisma.shagerdReqsForMechanicCoWork.count({ where })
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

  async getMechanicAllActiveMechanicNoticeDastyars(req, res, next) {
    try {
      const { id: mechanicId } = req.user;
      const { page = 1, limit = 10 } = req.query;

      const where = {
        mechanicId,
        status: 'IN_PROGRESS',
        isAvailable: true
      };

      const [activeNotices, total] = await prisma.$transaction([
        prisma.noticeDastyar.findMany({
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
        prisma.noticeDastyar.count({ where })
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

  async getGarageAllActiveMechanicNoticeDastyars(req, res, next) {
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
        prisma.noticeDastyar.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            mechanic: {
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
        prisma.noticeDastyar.count({ where })
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

  async shareDastyarRequest(req, res, next) {
    try {
      const { noticeDastyarId } = req.params;
      
      const notice = await prisma.noticeDastyar.findUnique({
        where: { id: noticeDastyarId },
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
            noticeDastyar: { connect: { id: noticeDastyarId } }
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
    async addCoworkReqForNoticeDastyar(req, res, next) {
      try {
        const { user, params } = req;
        const { noticeDastyarId } = params;
        
        // تعیین نوع درخواست و مقادیر مورد نیاز
        const isDastyarRequest = !!user.mechanicAt;
        const garageId = isDastyarRequest ? user.mechanicAt?.id : user.ownedGarage?.id;
        const mechanicId = isDastyarRequest ? user.id : params.mechanicId;
        
        // انتخاب مدل مناسب براساس نوع درخواست
        const prismaModel = isDastyarRequest 
          ? prisma.shagerdReqsForMechanicCoWork 
          : prisma.garageReqsForMechanicCoWork;
    
        const noticeDastyarDastyarReqs = await prismaModel.create({
          data: {
            garage: {
              connect: {
                id: garageId,
              },
            },
            mechanic: {
              connect: {
                id: mechanicId,
              },
            },
            noticeDastyar: {
              connect: {
                id: noticeDastyarId,
              },
            },
          },
        });
    
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data: {
            noticeDastyarDastyarReqs
          }
        });
      } catch (error) {
        console.error("Error creating mechanic notice request:", error);
        next(error);
      }
    }

    async showCoworkRequestsForRequesterGarage(req, res, next) {
        try {
            const { user } = req;
            const { ownedGarage } = user;

            if (!ownedGarage?.id) throw createError.Unauthorized("Only garage owners can view requests");

            const requests = await prisma.noticeDastyar.findMany({
                where: { requesterGarageId: ownedGarage.id },
                select: {
                    shagerdReqsForMechanicCoWork: true,
                    garageReqsForMechanicCoWork: true
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

    async addMechanicToRequest(req, res, next) {
        try {
            const { user, params, body } = req;
            const { mechanicId, noticeDastyarId } = params;
            const { dueDate, description, amount } = body;
            const { ownedGarage } = user;

            if (!ownedGarage?.id) throw createError.Unauthorized("Only garage owners can add mechanics");

            const result = await prisma.$transaction(async (prisma) => {
                // Update mechanicship notice
                const notice = await prisma.noticeDastyar.update({
                    where: { id: noticeDastyarId },
                    data: {
                        mechanicId,
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
                        noticeDastyar: { connect: { id: noticeDastyarId } },
                        transactionsActivityLog: {
                            create: {
                                action: "ترنزاکشن درخواست مکانیک ایجاد شد",
                                project: { connect: { id: notice.projectId } },
                                noticeDastyar: { connect: { id: noticeDastyarId } }
                            }
                        }
                    }
                });

                return { notice, transaction };
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "مکانیک موردنظر به پروژه افزوده شد",
                    result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisMechanicFromDastyarRequest(req, res, next){
        try {
            const {user, params} = req;
            const { ownedGarage } = user;
            const garageId = ownedGarage?.id;
            if(!garageId) throw createError.Unauthorized;
            const { noticeDastyarId, mechanicId } = params;

            const addMechanic = await prisma.noticeDastyar.update({
                where: {
                    id: noticeDastyarId,
                },
                data: {
                    mechanic: {
                        disconnect: {
                          id: mechanicId,
                        },
                    },
                },
            });
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message:
                    "مکانیک موردنظر از پروژه حذف شد"
                }
              });
        } catch (error) {
            console.error("Error showing all mechanic notice requests:", error);
            next(error)
        }
    }

    async mechanicRefusingFromThisNoticeDastyar(req, res, next){
     try {
      const { params, user } = req;
      const { noticeDastyarId } = params;
      const { id: mechanicId } = user;
      const noticeDastyar = await this.findDastyarRequestById(noticeDastyarId)
      // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
      if (!noticeDastyar.mechanicId.equals(mechanicId)) {
        throw createError.NotAcceptable("ویرایش ترنزاکشتن فقط برای طرفین آن مجاز است");
      };

      const refuseRequest = await prisma.noticeDastyar.update({
        where: {
          id: noticeDastyarId,
        },
        data: {
          mechanic: {
            disconnect: {
              id: mechanicId,
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
          console.error("Error showing all mechanic notice requests:", error);
          next(error)
      }
    }

    async confirmTransactionCompletion(req, res, next) {
        try {
            const { params, user } = req;
            const { transactionId } = params;
            const { id: userId } = user;
            const role = user.mechanicAt ? 'mechanic' : 'garageOwner';

            await this.#validateTransactionOwnership(transactionId, userId, role);

            const updateData = role === 'mechanic' 
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
              noticeDastyar: {
                select: isGarage ? {
                  mechanic: {
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
            ? transaction.noticeDastyar.mechanic.id
            : transaction.noticeDastyar.requesterGarage.garageOwner.id;
      
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

    async addReviewForDastyarRequest(req, res, next) {
        try {
          const { params, body, user } = req;
          const { noticeDastyarId } = params;
          const { comment, rating, projectId, targetId, mechanicId } = body;
          const { id: authorId, ownedGarage } = user;
          
          // تعیین نوع کاربر و اطلاعات مربوطه
          const isGarageOwner = !!ownedGarage;
          const garageId = ownedGarage?.id;
          const finalTargetId = isGarageOwner ? mechanicId : targetId;
      
          // ساخت آبجکت پایه برای عملیات
          const baseReviewData = {
            noticeDastyar: {
              connect: {
                id: noticeDastyarId,
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
              noticeDastyarId: noticeDastyarId,
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
          console.error("Error adding review for mechanic request:", error);
          next(error);
        }
      }
}

module.exports = {
    DastyarNoticeController: new DastyarNoticeController()
};
