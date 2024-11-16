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
const { ObjectIdValidator } = require("../../../validators/public.validator");

class SupplierStoreRegistrationController extends Controller{
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

   async registrationSupplierStore(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);

          const {supplierstore_name,
            telephone,
            addres,
            lat_lng,
            images,
            supplierstoreField,
            first_name,
             last_name,} = registrationDataBody;
            const serialNum = serialNumGenerator();
            const supplierstore_Owner = req.user._id;
          const supplierStoreRegistration = await SupplierStoresModel.create({
            supplierstore_name,
            telephone,
            addres,
            images,
            lat_lng,
            supplierstoreField,
            supplierstoreOwner : supplierstore_Owner,
            supplierStoreSerialNumber : serialNum,
            })
            const findSupplierStore = await SupplierStoresModel.findOne(
              {"supplierStoreSerialNumber" : serialNum});
              const data = {};
            if(first_name) data.first_name = first_name;
            if(last_name) data.last_name = last_name;            
            data.Role = ROLES.SUPPLIER;
            data.supplierStoreID = findSupplierStore._id;
            const userUpdate = await UsersModel.updateOne(
              {"_id": supplierstore_Owner},
              {$Set: data});

               // ایجاد اشتراک
         const startDate = new Date();
         const endDate= new Date();
         endDate.setMonth(startDate.getMonth() + 3);
         const newSubscription = await SubscriptionsModel.create({
          user : garage_owner,
          subscriptionStartDate : startDate,
          subscriptionEndDate : endDate,
          subscriptionType : "free"
         });
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "تامین کنننده گرامی کسب و کار شما با موفقیت ایجاد و اشتراک 3 ماهه رایگان برای شما فعال شد"
              }
          });
    } catch (error) {
      deleteFileInPublic(req.files);
        next(error)
    }
   }


   async invitedWithGarageReferal(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);
          const {supplierStoreSerialNumber} = registrationDataBody;
          const supplierStoreID = req.user.supplierStoreID;
          const addReferal = await SupplierStoresModel.updateOne(
            {"supplierStoreSerialNumber" : supplierStoreSerialNumber},
            {$addToSet: {referal : supplierStoreID}})
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "شما به لیست دعوت شده های یدکی مربوطه اضافه شدید"
              }
          });
    } catch (error) {
        next(error)
    }
   }
}

module.exports = {
  SupplierStoreRegistrationController: new SupplierStoreRegistrationController()
}