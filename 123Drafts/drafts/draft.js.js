const createError = require("http-errors");
const { StatusCodes: HttpStatus} = require("http-status-codes");
const Controller = require("../../controller");
import { CorrelationType, PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const { getLink, getTime, ListOfImagesFromRequest, copyObjet } = require("../../../../utils/functions");
const {deleteFilesInPublicForOrders} = require("../../../../utils/functions");

class GarageAddApprenticeRequestController extends Controller{

    async createNewApprenticeRequest(req, res, next) {
        try {
          const { user, body, params, files } = req;
          const { id: publisherId, ownedGarage } = user;
          const garageId = ownedGarage?.id;
          const { projectId } = params;
      
          if (!garageId) {
            throw createError.Unauthorized("ثبت این آگهی فقط برای صاحبین گاراژ امکان پذبر است");
          }
      
          const registrationDataBody = await noticeApprenticeSchema.validateAsync(body);
          const { title, city, budget } = registrationDataBody;
      
          // Process attachments
          const attachments = [];
      
          // Handle images
          const images = ListOfImagesFromRequest(files || [], body.fileUploadPath);
          if (images.length > 0) {
            images.forEach(image => {
              const fileInfo = files.find(f => path.basename(image) === f.filename);
              attachments.push({
                url: image,
                filename: path.basename(image),
                fileType: 'image',
                fileSize: fileInfo?.size?.toString() || '0',
                mimeType: fileInfo?.mimetype || 'image/jpeg',
                dimensions: { width: 0, height: 0 }, // You might want to calculate actual dimensions
                status: 'COMPLETED',
                // Add required relations with appropriate IDs
                noticeApprenticeId: process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID,
              });
            });
          }
      
          // Handle video
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
      
          // Handle voice files
          const voiceFiles = files?.voice || [];
          if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const { fileUploadPath } = body;
            const filename = voiceFiles[0].filename;
            
            if (filename && fileUploadPath) {
              const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
              const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`;
              
              try {
                const seconds = await getAudioDurationInSeconds(voiceURL);
                const duration = getTime(seconds);
                
                attachments.push({
                  url: voiceAddress,
                  filename: filename,
                  fileType: 'audio',
                  fileSize: voiceFiles[0].size.toString(),
                  mimeType: voiceFiles[0].mimetype,
                  duration: duration,
                  status: 'COMPLETED',
                  // Add required relations with appropriate IDs
                  noticeApprenticeId: process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID,
                });
              } catch (error) {
                console.error("Error calculating audio duration:", error);
              }
            }
          }
      
          const result = await prisma.$transaction(async (prisma) => {
            // Create the apprentice notice with attachments
            const noticeApprenticeship = await prisma.noticeApprenticeship.create({
              data: {
                publisher: {
                  connect: { id: publisherId }
                },
                requesterGarage: {
                  connect: { id: garageId }
                },
                project: {
                  connect: { id: projectId }
                },
                title,
                city,
                budget,
                // Create attachments
                attachments: {
                  create: attachments
                }
              },
              include: {
                attachments: true
              }
            });

            // Generate and create share link
            const generatedSerial = getLink(publisher);
            const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`;
            
            const share = await prisma.share.create({
              data: {
                shareUrl: shareLink,
                noticeApprentice: {
                  connect: { id: noticeApprenticeship.id }
                }
              }
            });

            // Update notice with share
            await prisma.noticeApprenticeship.update({
              where: { id: noticeApprenticeship.id },
              data: {
                shares: { connect: { id: share.id } }
              }
            });
      
            return { noticeApprenticeship, share };
          });
      
          return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
              message: "آگهی درخواست شاگرد با موفقیت برای شما ثبت شد",
              noticeApprenticeship: result.noticeApprenticeship,
              share: result.share
            }
          });
      
        } catch (error) {
          // Clean up uploaded files in case of error
          deleteFilesInPublicForOrders(req.files);
          console.error("Error creating apprentice notice:", error);
          next(error);
        }
    }
      
    async getAllNoticeApprentice(req, res, next) {
      try {
     const {city} = req.query;
     const noticeApprentice = await prisma.noticeApprenticeship.findMany({
      where: {
        city: city
      },
     });
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
         noticeApprentice
        }
      });
    } catch (error) {
      console.error("Error creating apprentice notice:", error);
      next(error);
    }
    } 

    async getOneNoticeApprenticeById(req, res, next) {
      try {
     const {noticeApprenticeId} = req.params;
     const noticeApprentice = await prisma.noticeApprenticeship.findUnique({
      where: {
        id: noticeApprenticeId,
      },
     });
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
         noticeApprentice
        }
      });
    } catch (error) {
      console.error("Error creating apprentice notice:", error);
      next(error);
    }
    } 

    async removeApprenticeRequestById(req, res, next){
    try {
        const { user, params } = req;
        const {id: publisherId} = user;
        const {noticeApprenticeId} = params;
    // پیدا کردن پست و اطمینان از موجودیت آن
    const noticeApprentice = await this.findApprenticeRequestById(noticeApprenticeId)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!noticeApprentice.publisherId.equals(publisherId)) {
        throw createError.NotAcceptable("ویرایش آگهی فقط برای ناشر آن مجاز است");
      }
           const removeNoticeResult = await prisma.noticeApprenticeship.delete({
            where:{
                id: noticeApprenticeId,
            },
           });
           if (!removeNoticeResult.deletedCount) throw createError.InternalServerError("حذف آگهی انجام نشد");
       
       return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data : {
          message: "حذف آگهی با موفقیت انجام شد"
        }
      });
    } catch (error) {
        console.error("Error deleting apprentice notice:", error);
        next(error);
    }
    }

    async editApprenticeRequestsById(req, res, next) {
      try {
        await UpdateApprenticeRequestSchema.validateAsync(req.body);
        const { noticeApprenticeId } = req.params;
        const publisherId = req.user.id;
    
        // Find the notice and verify ownership
        const noticeApprenticeship = await prisma.noticeApprenticeship.findUnique({
          where: { id: noticeApprenticeId },
          include: { 
            attachments: {
              select: {
                id: true,
                fileType: true,
                url: true
              }
            }
          }
        });
    
        if (!noticeApprenticeship) {
          throw createError.NotFound("آگهی مورد نظر یافت نشد");
        }
    
        if (noticeApprenticeship.publisherId !== publisherId) {
          throw createError.NotAcceptable("ویرایش آگهی فقط برای ناشر آن مجاز است");
        }
    
        // Copy and clean request data
        let data = copyObjet(req.body);
        const blackListFields = [
          "id",
          "publisherId",
          "createdAt",
          "updatedAt",
          "bookmarks",
          "conversation",
          "transaction",
          "milestones",
          "reviews",
          "transactionsActivityLogs",
          "share"
        ];
    
        // Arrays to track attachment changes
        const newAttachments = [];
        const attachmentsToDelete = [];
        
        // Handle images
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        if (images.length > 0) {
          // Find existing image attachments
          const existingImageAttachments = noticeApprenticeship.attachments.filter(
            att => att.fileType === 'image'
          );
    
          // If we have more new images than existing ones, we'll only replace the existing ones
          // and add the extra ones as new attachments
          images.forEach((image, index) => {
            const attachmentData = {
              url: image,
              filename: path.basename(image),
              fileType: 'image',
              fileSize: req.files.find(f => path.basename(image) === f.filename)?.size?.toString() || '0',
              mimeType: req.files.find(f => path.basename(image) === f.filename)?.mimetype || 'image/jpeg',
              dimensions: { width: 0, height: 0 },
              status: 'COMPLETED',
              // Add required relations with appropriate IDs
              noticeApprenticeId: process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID,
            };
    
            // If there's an existing image attachment at this index, mark it for deletion
            if (existingImageAttachments[index]) {
              attachmentsToDelete.push(existingImageAttachments[index].id);
            }
            
            newAttachments.push(attachmentData);
          });
        }
    
        // Handle video
        const videoFiles = req?.files?.video || [];
        if (Array.isArray(videoFiles) && videoFiles.length > 0) {
          // Find existing video attachment
          const existingVideoAttachment = noticeApprenticeship.attachments.find(
            att => att.fileType === 'video'
          );
    
          if (existingVideoAttachment) {
            attachmentsToDelete.push(existingVideoAttachment.id);
          }
    
          const { fileUploadPath } = req.body;
          const filename = videoFiles[0].filename;
          
          if (filename && fileUploadPath) {
            const videoAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
            const videoURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`;
            
            try {
              const seconds = await getVideoDurationInSeconds(videoURL);
              const duration = getTime(seconds);
              
              newAttachments.push({
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
    
        // Remove invalid fields
        deleteInvalidPropertyInObject(data, blackListFields);
    
        // Update the notice and manage attachments
        const updatedNotice = await prisma.noticeApprenticeship.update({
          where: { id: noticeApprenticeId },
          data: {
            ...data,
            attachments: {
              // Delete only specific attachments that need to be replaced
              deleteMany: attachmentsToDelete.length > 0 ? {
                id: {
                  in: attachmentsToDelete
                }
              } : undefined,
              // Create new attachments
              create: newAttachments.length > 0 ? newAttachments : undefined
            }
          }
        });
    
        if (!updatedNotice) {
          throw createError.InternalServerError("بروزرسانی آگهی انجام نشد");
        }
    
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data: {
            message: "به روز رسانی با موفقیت انجام شد"
          }
        });
    
      } catch (error) {
        // Clean up uploaded files in case of error
        deleteFilesInPublicForOrders(req.files);
        next(error);
      }
    }

    async getAllOfGarageApprenticeRequests(req, res, next){
      try {
          const { user } = req;
          const { ownedGarage } = user;
          const garageId = ownedGarage?.id;
          if(!garageId) throw createError.Unauthorized("ثبت درخواست شاگرد مخصوص صاحبان گاراژ میباشد");
          noticeApprentice = await prisma.noticeApprenticeship.findMany({
              where: {
                  requesterGarageId: garageId, 
              },
          });
          return res.status(HttpStatus.OK).json({
              statusCode : HttpStatus.OK,
              data : {
                  noticeApprentice
              }
          })
      } catch (error) {
          console.error("Error getting all apprentice notice:", error);
          next(error)
      }
    }

    async getAllGarageNoticeApprentices(req, res, next){
      try {
        const { user } = req;
      const { id: authorId, ownedGarage } = user;
      const garageId = ownedGarage.id;

      const noticeApprentice = await prisma.noticeApprenticeship.findMany({
        where: {
          publisherId: authorId,
          requesterGarageId: garageId,
        },
      });
     
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          noticeApprentice
                },
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }


    }

    async getAllApprenticeNoticeAppRequests(req, res, next){
      try {
        const { user } = req;
        const { id: apprenticeId } = user;

        const noticeApprenticeReqs = await prisma.shagerdReqsForApprenticeCoWork.findMany({
          where: {
            apprenticeId: apprenticeId,
          },
        });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          noticeApprenticeReqs
           },
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async getApprenticeAllActiveApprenticeNoticeApps(req, res, next){
      try {
        const { user } = req;
        const { id: apprenticeId } = user;

        const activeNoticeApprentice = await prisma.noticeApprenticeship.findMany({
          where: {
            apprenticeId: apprenticeId,
          },
        });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          activeNoticeApprentice
           },
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async getGarageAllActiveApprenticeNoticeApps(req, res, next){
      try {
        const { user } = req;
        const { id: authorId, ownedGarage } = user;
        const { garageId } = ownedGarage.id;

        const activeNoticeApprentices = await prisma.noticeApprenticeship.findMany({
          where: {
            publisherId: authorId,
            requesterGarageId: garageId,
            status: 'IN_PROGRESS'
          },
        });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
          activeNoticeApprentices
           },
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async BookmarkNoticeApprentice(req, res, next){
          try {
              const { params, user } = req;
              const { Id: userId } = user;
              const { noticeApprenticeId } = params;
          
              // Verify the apprentice request exists
              await this.findApprenticeRequestById(noticeApprenticeId);
          
              // Check if bookmark exists
              const existingBookmark = await prisma.bookmark.findFirst({
                where: {
                  userId,
                  noticeApprenticeshipId: noticeApprenticeId
                }
              });
          
              let message;
              if (existingBookmark) {
                // Remove bookmark
                await prisma.bookmark.delete({
                  where: {
                    id: existingBookmark.id
                  }
                });
                message = "آگهی از علاقه مندی های شما حذف شد";
              } else {
                // Create bookmark
                await prisma.bookmark.create({
                  data: {
                    userId,
                    noticeApprenticeshipId: noticeApprenticeId
                  }
                });
                message = "آگهی به علاقه مندی های شما اضافه شد";
              }
          
              return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                  message
                }
              });
            } catch (error) {
              console.error("Error bookmarking apprentice notice:", error);
              next(error);
            }
    }

    async shareApprenticeRequest(req, res, next){
      try {
          const {noticeApprenticeId} = req.params;
          await this.findApprenticeRequestById(noticeApprenticeId);
          const noticeApprentice = await prisma.noticeApprenticeship.findUnique({
              where: {
                  id: noticeApprenticeId,
              },
              select: {
                  share: {
                      select :{
                          id,
                      },
                  },
              },
          });
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data : {
                  noticeApprentice
              }
          })
      } catch (error) {
          console.error("Error in receiving apprentice notice shareLink:", error);
          next(error)
      }
    }
 
    async addCoworkReqForNoticeApprenticeByApprentice(req, res, next){
      try {
          const { user, params } = req;
          const { id: apprenticeId } = user;
          const { noticeApprenticeId } = params;
          const { apprenticeAt } = user;
          const garageId = apprenticeAt?.id;
          const noticeApprenticeAppReqs = await prisma.shagerdReqsForApprenticeCoWork.create({
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
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async addCoworkReqForNoticeApprenticeByGarage(req, res, next){
      try {
          const { user, params } = req;
          const { apprenticeId } = params;
          const { noticeApprenticeId } = params;
          const { ownedGarage } = user;
          const garageId = ownedGarage?.id;
          const noticeApprenticeAppReqs = await prisma.garageReqsForApprenticeCoWork.create({
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
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async showApprenticesAndGaragesCoWorkingReqsForAppRequest(req, res, next){
      try {
          const { user } = req;
          const { ownedGarage } = user;
          const garageId = ownedGarage?.id;

          const noticeApprenticeAppReqs = await prisma.noticeApprenticeship.findMany({
              where: {
                  requesterGarageId: garageId,
              },
              select: {
                  shagerdReqsForApprenticeCoWork: true,
                  garageReqsForApprenticeCoWork: true,
              },
          });
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  noticeApprenticeAppReqs
              }
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async addAndChooseThisApprenticeToApprenticeRequest(req, res, next){
      try {
          const {user, params, body} = req;
          const { ownedGarage } = user;
          const garageId = ownedGarage?.id;
          if(!garageId) throw createError.Unauthorized;
          const {dueDate, description} = body;
          const { apprenticeId } = params;
          const { noticeApprenticeId } = params;

          const result = await prisma.$transaction(async (prisma) => {
          //update noticeApprentice record to add apprentice
          const addApprentice = await prisma.noticeApprenticeship.update({
              where: {
                  id: noticeApprenticeId,
              },
              data: {
                  apprenticeId: apprenticeId,
                  milestones: {
                    create: {
                      dueDate: dueDate,
                      description: description,
                      project: {
                        connect: {
                          id: projectId,
                        },
                      },
                      payment: {
                        create: {
                          amount: amount,
                        },
                      },
                    },
                  },
              },
          });
          // create a Transaction Record
          const { projectId } = addApprentice.projectId;
          const {amount} = addApprentice.budget;
          const createTransaction = await prisma.transaction.create({
              data: {
                  amount,
                  project: {
                      connect: {
                          id: projectId,
                      },
                  },
                  noticeApprentice: {
                      connect: {
                          id: noticeApprenticeId,
                      },
                  },
                  transactionsActivityLog: {
                    create: {
                      project: {
                        connect:{
                          id: projectId,
                        },
                      },
                      action: "ترنزاکشن درخواست شاگرد ایجاد شد",
                      noticeApprentice: {
                        connect: {
                          id: noticeApprenticeId,
                        },
                      },
                    },
                  },
                  milestonePayments: {
                    create
                  },
              },
          });
          return { addApprentice, createTransaction };
          });
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  message:
                  "شاگرد موردنظر به پروژه افزوده شد",
                  addApprentice: result.addApprentice,
                  createTransaction: result.createTransaction
              }
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
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

    async conversationStartBetweenApprenticeAndGarage(req, res, next){
      try {
          
      } catch (error) {
        console.error("Error showing all apprentice notice requests:", error);
        next(error)
      }
    }

    async completionAndPaymentConfirmByApprentice(req, res, next){
      try {
          const { params, user } = req;
          const { transactionId, noticeApprenticeId } = params;
          const { id: apprenticeId } = user;
        // پیدا کردن ترنزاکشن و اطمینان از موجودیت آن
        const transaction = await this.findTransactionById(transactionId);
        const noticeApprentice = await this.findApprenticeRequestById(noticeApprenticeId)
        // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
        if (!noticeApprentice.apprenticeId.equals(apprenticeId)) {
          throw createError.NotAcceptable("ویرایش ترنزاکشتن فقط برای طرفین آن مجاز است");
        }
        const confirmCompletion = await prisma.transaction.update({
          where: {
            id: transactionId,
          },
          data: {
           providerConfirmedCompletion: true,
           providerConfirmedPayment: true,
          },
        });

        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data: {
              message:
              "این همکاری از سمت شما با موفقیت پایان یافت"
                }
              });
        } catch (error) {
            console.error("Error showing all apprentice notice requests:", error);
            next(error)
        }
    }
    
    async completionAndPaymentConfirmByGarage(req, res, next){
      try {
        const { params, user } = req;
        const { transactionId, noticeApprenticeId } = params;
        const { id: publisherId } = user;
      // پیدا کردن ترنزاکشن و اطمینان از موجودیت آن
      const transaction = await this.findTransactionById(transactionId);
      const noticeApprentice = await this.findApprenticeRequestById(noticeApprenticeId)
      // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
      if (!noticeApprentice.publisherId.equals(publisherId)) {
        throw createError.NotAcceptable("ویرایش ترنزاکشتن فقط برای طرفین آن مجاز است");
      }
      const confirmCompletion = await prisma.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
         requesterConfirmedCompletion: true,
         requesterConfirmedPayment: true,
        },
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
            message:
            "این همکاری از سمت شما با موفقیت پایان یافت"
              }
            });
      } catch (error) {
          console.error("Error showing all apprentice notice requests:", error);
          next(error)
      }
    }

    async createComplaintByGarage(req, res, next){
      try {
        const { params, user, body} = req;
        const { transactionId } = params;
        const {id: authorId} = user;
        const { description } = body;     
        
        // Process attachments
        const attachments = [];
        // Handle images
        const images = ListOfImagesFromRequest(files || [], body.fileUploadPath);
        if (images.length > 0) {
          images.forEach(image => {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
              url: image,
              filename: path.basename(image),
              fileType: 'image',
              fileSize: fileInfo?.size?.toString() || '0',
              mimeType: fileInfo?.mimetype || 'image/jpeg',
              dimensions: { width: 0, height: 0 }, // You might want to calculate actual dimensions
              status: 'COMPLETED',
              CorrelationType: 'AUTHOR',
              // Add required relations with appropriate IDs
              complaintId: process.env.DEFAULT_COMPLAINT_ID,
            });
          });
        }
          // Handle voice files
          const voiceFiles = files?.voice || [];
          if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const { fileUploadPath } = body;
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
              const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
              const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`; 
              try {
                const seconds = await getAudioDurationInSeconds(voiceURL);
                const duration = getTime(seconds);
                attachments.push({
                  url: voiceAddress,
                  filename: filename,
                  fileType: 'audio',
                  fileSize: voiceFiles[0].size.toString(),
                  mimeType: voiceFiles[0].mimetype,
                  duration: duration,
                  status: 'COMPLETED',
                  CorrelationType: 'AUTHOR',
                  // Add required relations with appropriate IDs
                  complaintId: process.env.DEFAULT_COMPLAINT_ID,
                });
              } catch (error) {
                console.error("Error calculating audio duration:", error);
              }
            }
          }

        const targetId = await prisma.transaction.findUnique({
          where: {
            id: transactionId,
          },
          select: {
            noticeApprentice: {
              select: {
                apprentice:{
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
        });
      const creatComplaint = await prisma.complaint.create({
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
         // Create attachments
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
              message:
              "شکایت شما از گاراژ طرف هکاری ثبت شد برای بررسی و حصول نتیجه صبور باشید"
          }
        });
  } catch (error) {
      console.error("Error showing all apprentice notice requests:", error);
      next(error)
  }
    }

    async createComplaintByApprentice(req, res, next){
      try {
        const { params, user, body} = req;
        const { transactionId } = params;
        const {id: authorId} = user;
        const { description } = body;     
        
        // Process attachments
        const attachments = [];
        // Handle images
        const images = ListOfImagesFromRequest(files || [], body.fileUploadPath);
        if (images.length > 0) {
          images.forEach(image => {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
              url: image,
              filename: path.basename(image),
              fileType: 'image',
              fileSize: fileInfo?.size?.toString() || '0',
              mimeType: fileInfo?.mimetype || 'image/jpeg',
              dimensions: { width: 0, height: 0 }, // You might want to calculate actual dimensions
              status: 'COMPLETED',
              CorrelationType: 'AUTHOR',
              // Add required relations with appropriate IDs
              complaintId: process.env.DEFAULT_COMPLAINT_ID,
            });
          });
        }
          // Handle voice files
          const voiceFiles = files?.voice || [];
          if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const { fileUploadPath } = body;
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
              const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
              const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`; 
              try {
                const seconds = await getAudioDurationInSeconds(voiceURL);
                const duration = getTime(seconds);
                attachments.push({
                  url: voiceAddress,
                  filename: filename,
                  fileType: 'audio',
                  fileSize: voiceFiles[0].size.toString(),
                  mimeType: voiceFiles[0].mimetype,
                  duration: duration,
                  status: 'COMPLETED',
                  CorrelationType: 'AUTHOR',
                  // Add required relations with appropriate IDs
                  complaintId: process.env.DEFAULT_COMPLAINT_ID,
                });
              } catch (error) {
                console.error("Error calculating audio duration:", error);
              }
            }
          }

        const targetId = await prisma.transaction.findUnique({
          where: {
            id: transactionId,
          },
          select: {
            noticeApprentice: {
              select: {
                requesterGarage:{
                  select: {
                    garageOwner:{
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
      const creatComplaint = await prisma.complaint.create({
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
         // Create attachments
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
              message:
              "شکایت شما از گاراژ طرف هکاری ثبت شد برای بررسی و حصول نتیجه صبور باشید"
          }
        });
  } catch (error) {
      console.error("Error showing all apprentice notice requests:", error);
      next(error)
  }
    }

    async responceToGarageComplaintByApprentice(req, res, next){
      try {
       const { params, user, body} = req;
       const { complaintId } = params;
       const { response } = body;  
       const {id: targetId} = user;
 
        // Process attachments
        const attachments = [];
        // Handle images
        const images = ListOfImagesFromRequest(files || [], body.fileUploadPath);
        if (images.length > 0) {
          images.forEach(image => {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
              url: image,
              filename: path.basename(image),
              fileType: 'image',
              fileSize: fileInfo?.size?.toString() || '0',
              mimeType: fileInfo?.mimetype || 'image/jpeg',
              dimensions: { width: 0, height: 0 }, // You might want to calculate actual dimensions
              status: 'COMPLETED',
              CorrelationType: 'TARGET',
              // Add required relations with appropriate IDs
              complaintId: process.env.DEFAULT_COMPLAINT_ID,
            });
          });
        }
          // Handle voice files
          const voiceFiles = files?.voice || [];
          if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const { fileUploadPath } = body;
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
              const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
              const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`; 
              try {
                const seconds = await getAudioDurationInSeconds(voiceURL);
                const duration = getTime(seconds);
                attachments.push({
                  url: voiceAddress,
                  filename: filename,
                  fileType: 'audio',
                  fileSize: voiceFiles[0].size.toString(),
                  mimeType: voiceFiles[0].mimetype,
                  duration: duration,
                  CorrelationType: 'TARGET',
                  status: 'COMPLETED',
                  // Add required relations with appropriate IDs
                  complaintId: process.env.DEFAULT_COMPLAINT_ID,
                });
              } catch (error) {
                console.error("Error calculating audio duration:", error);
              }
            }
          }
          const checkAuth = await prisma.complaint.findUnique({
           where: {
              id: complaintId,
           },
         });
         if(targetId !== checkAuth.targetId) throw createError.Unauthorized("مداخله فقط برای طرفین شکایت مجاز است");
         const apprenticeResponse = await prisma.complaint.update({
           where: {
             id: complaintId,
           },
           data: {
             response: response,
                 // Create attachments
                 evidence: {
                   create: attachments,
                 },
               },
               include: {
                 attachments: true,
               },
          });
       
       return res.status(HttpStatus.OK).json({
         statusCode: HttpStatus.OK,
         data: {
             message:
             "شواهد شما در شکایت مربوطه ثبت شد برای بررسی و حصول نتیجه صبور باشید"
         }
       });
 } catch (error) {
     console.error("Error showing all apprentice notice requests:", error);
     next(error)
 }
     }

    async responseToApprenticeComplaintByGarage(req, res, next){
      try {
        const { params, user, body} = req;
        const { complaintId } = params;
        const { response } = body;  
        const {id: targetId} = user;
 
        // Process attachments
        const attachments = [];
        // Handle images
        const images = ListOfImagesFromRequest(files || [], body.fileUploadPath);
        if (images.length > 0) {
          images.forEach(image => {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
              url: image,
              filename: path.basename(image),
              fileType: 'image',
              fileSize: fileInfo?.size?.toString() || '0',
              mimeType: fileInfo?.mimetype || 'image/jpeg',
              dimensions: { width: 0, height: 0 }, // You might want to calculate actual dimensions
              status: 'COMPLETED',
              CorrelationType: 'TARGET',
              // Add required relations with appropriate IDs
              complaintId: process.env.DEFAULT_COMPLAINT_ID,
            });
          });
        }
          // Handle voice files
          const voiceFiles = files?.voice || [];
          if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const { fileUploadPath } = body;
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
              const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
              const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`; 
              try {
                const seconds = await getAudioDurationInSeconds(voiceURL);
                const duration = getTime(seconds);
                attachments.push({
                  url: voiceAddress,
                  filename: filename,
                  fileType: 'audio',
                  fileSize: voiceFiles[0].size.toString(),
                  mimeType: voiceFiles[0].mimetype,
                  duration: duration,
                  CorrelationType: 'TARGET',
                  status: 'COMPLETED',
                  // Add required relations with appropriate IDs
                  complaintId: process.env.DEFAULT_COMPLAINT_ID,
                });
              } catch (error) {
                console.error("Error calculating audio duration:", error);
              }
            }
          }
        const checkAuth = await prisma.complaint.findUnique({
          where: {
             id: complaintId,
          },
        });
        if(targetId !== checkAuth.targetId) throw createError.Unauthorized("مداخله فقط برای طرفین شکایت مجاز است");
     const garageResponse = await prisma.complaint.update({
      where: {
        id: complaintId,
      },
      data: {
        response: response,
            // Create attachments
            evidence: {
              create: attachments,
            },
          },
          include: {
            attachments: true,
          },
     })
     
        return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
            message:
            "شواهد شما در شکایت مربوطه ثبت شد برای بررسی و حصول نتیجه صبور باشید"
        }
      });
} catch (error) {
    console.error("Error showing all apprentice notice requests:", error);
    next(error)
}
    }

    async addApprenticeCommentRateReviewForApprenticeRequest(req, res, next){
        try {
            const { params, body, user } = req;
            const { noticeApprenticeId } = params;
            const {comment, rating, projectId, targetId} = body;
            const { id: authorId } = user;
            
          const addReview = await prisma.review.upsert({
            where: {
              noticeApprenticeId : noticeApprenticeId,
            },
            create: {
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
                  id: targetId,
                },
              },
             author: {
              connect: {
                id: authorId,
              },
             },
             response: comment,
             rating: rating,
            },
            update: {
            response: comment,
            rating: rating,
            },
          });

          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message:
                "باتشکر...نظر و امتیاز شما برای این همکاری ثبت شد"
            }
          });
    } catch (error) {
        console.error("Error showing all apprentice notice requests:", error);
        next(error)
    }
    }

    async addGarageCommentRateReviewForApprenticeInApprenticeRequest(req, res, next){
      try {
        const { params, body, user } = req;
        const { noticeApprenticeId } = params;
        const {comment, rating, projectId, apprenticeId} = body;
        const { id: authorId, ownedGarage} = user;
        const garageId = ownedGarage?.id;
      const addReview = await prisma.review.upsert({
        where: {
          noticeApprenticeId : noticeApprenticeId,
        },
        create: {
          noticeApprentice: {
            connect: {
              id: noticeApprenticeId,
            },
          },
          garage: {
            connect: {
              id: garageId,
            },
          },
          project: {
            connect: {
              id: projectId,
            },
          },
          target: {
            connect: {
              id: apprenticeId,
            },
          },
         author: {
          connect: {
            id: authorId,
          },
         },
         response: comment,
         rating: rating,
        },
        update: {
          garage: {
            connect: {
              id: garageId,
            },
          },
        response: comment,
        rating: rating,
        },
      });

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: {
            message:
            "باتشکر...نظر و امتیاز شما برای این همکاری ثبت شد"
        }
      });
} catch (error) {
    console.error("Error showing all apprentice notice requests:", error);
    next(error)
}
    }
   ///////////////////////////////////////////////////////////////////
    async findApprenticeRequestById(noticeApprenticeId) {
      const { id } = await ObjectIdValidator.validateAsync({ id: noticeApprenticeId });
      const noticeApprentice = await prisma.noticeApprenticeship.findUnique({
          where: {
              id: id,
          },
      });
      if (!noticeApprentice) throw new createError.NotFound("چنین آگهی یافت نشد ممکن است قبلا حذف شده باشد")
      return noticeApprentice
    }

    async findTransactionById(transactionId) {
      const { id } = await ObjectIdValidator.validateAsync({ id: transactionId });
      const transaction = await prisma.transaction.findUnique({
          where: {
              id: id,
          },
      });
      if (!transaction) throw new createError.NotFound("چنین ترنزاکشنی یافت نشد ممکن است قبلا حذف شده باشد")
      return transaction
    }
}

module.exports = {
    GarageAddApprenticeRequestController: new GarageAddApprenticeRequestController()
}