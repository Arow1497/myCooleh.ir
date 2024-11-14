const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../../../utils/functions");
const { garagesSchema } = require("../../validators/MainApp/garages.schema");
const { ObjectIdValidator } = require("../../validators/public.validator");


class PwaRegistrationController extends Controller{
// Private helper methods
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
                const seconds = await audioSeconds(voiceURL);
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
   async registrationPWA(req, res, next){
    try {
            const clientDataBody = await createBlogSchema.validateAsync(req.body);
            const {first_name,
                last_name,
                carPlateNumber,
                carBuildYear,
                carModel,
                chassisNumber} = clientDataBody;      
            const data = {};
             if(first_name) data.first_name = first_name;
             if(last_name) data.last_name = last_name;
             if(carPlateNumber) data.carPlateNumber = carPlateNumber;
             if(carBuildYear) data.carBuildYear = carBuildYear;
             if(carModel) data.carModel = carModel;
             if(chassisNumber) data.chassisNumber = chassisNumber;
             data.role = ROLES.CLIENT;

        const clientID = req.client.id;
        const registration = await prisma.client.update({
            where: {
                id: clientID,
            },
            data: {
                data
            },
        });
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "پروفایل مشتری با موفقیت بروز رسانی شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }

   async garageClientAcceptance(req, res, next){
    try {
        const connectingDataBody = await garagesSchema.validateAsync(req.body);
          const {carModel, carChassisNumber, carBuildYear,carPlateNumber, garageSerialNumber} = connectingDataBody;
          const client_ID = req.client._id
          console.log(client_ID);
          const findGarage = await GaragesModel.findOne({"garageSerialNumber": garageSerialNumber});
          if(!findGarage) throw createError.InternalServerError(" شماره سریال گاراژ نادرست است");
          const addToGarageAwaitList = await GarageAwaitListsModel.create({
            clientID : client_ID,
            garageID : findGarage._id,
            carModel,
            carPlateNumber,
            carChassisNumber,
            carBuildYear,
          })
              return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "درخواست پذیرش به گاراژ ارسال شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }

   async showSuggestionSupplyPartReqsToClient(req, res, next){
    try {
        const clientID = req.client._id;
        const projectID = req.params;
        const checkExist = await this.findProjectById(projectID);
        if (!checkExist.clientID.equals(clientID)) {
            throw createError.NotAcceptable("نمایش پیشنهادات تامین قطعه فقط برای کارفرمای آن مجاز است");
          }
        const showSuggestedRrqs = await ProjectsModel.findById(projectID)
        .populate({
            path: "suggestionSupplyRequests",
            select: "suggestionSupplyRequests",
        })
        .select("suggestionSupplyRequests")
        .exec();
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                showSuggestedRrqs
            }
        });
    } catch (error) {
        next(error)
    }
   }
   
   async selectThisSupplyRequestByClient(req, res, next){
    try {
        const RequestedForSupplyID = req.params;
        supplierStoreID = req.params; // ایدی یدکی داخل ریکوعستد سپلای هست
        const clientID = req.client._id;
        const projectID = req.params;
        const checkExist = await this.findProjectById(projectID);
        if (!checkExist.clientID.equals(clientID)) {
            throw createError.NotAcceptable("ثبت تغییرات تامین قطعه فقط برای کارفرمای آن مجاز است");
          }
          const applySupplierForProject = await ProjectsModel.findByIdAndUpdate({_id: projectID},
            {$addToSet: {
                "supplierStoreID": matchingReqs
            }
        });
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "انتخاب تامین کننده انجام شد برای تسویه حساب هماهنگی های لازم را با مکانیک خود انجام دهید"
            }
        });
    } catch (error) {
        next(error)
    }
   } // اینجا باید یک پوش نوتیفیکیشن برای مکاینیک بره که مشتری تامین کننده
   // رو انتخاب کرد تسویه حساب رو انجام بده
//////////////////////////////////////////////////////////////////////////
async findProjectById(projectID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: projectID });
    const project = await prisma.project.findUnique({
        where: {
            id: id,
        },
    });
    if (!project) throw new createError.NotFound("چنین پروژه ای یافت نشد")
    return project
  }
}

module.exports = {
    PwaRegistrationController: new PwaRegistrationController()
}