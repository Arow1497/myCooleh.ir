const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../../../../utils/functions");
const { garagesSchema } = require("../../../validators/MainApp/garages.schema");
const { serialNumGenerator, ListOfImagesFromRequest, deleteFileInPublic } = require("../../../../utils/functions");
const { getLink } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");

class PlatformAdsController extends Controller{
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
  //////////////////////////////////////////////////////////////////////////////

      // Controller methods
     async reqForAds(req, res, next){
        try {
          //کلن ها تایپ های مختلف دارن مثل مکانیکی ها اتوسرویس ها صافکار نقاشی
        } catch (error) {
          
        }
      }

     async interactRate_ViewClickShare_(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }   

      async payment(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

      async billingHistory(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

    
    }

    
module.exports = {
    PlatformAdsController: new PlatformAdsController()
}


