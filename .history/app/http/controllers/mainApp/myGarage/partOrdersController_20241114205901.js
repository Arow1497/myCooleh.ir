const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { audioSeconds, getTime, ListOfImagesFromRequest } = require("../../../../utils/functions");


class GaragePartOrdersController extends Controller{
 // Private helper methods
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
   async addEstimatedBrokenSectionsWithRequiredPartsForClientApprovalByGarage(req, res, next){
    try {
        
    } catch (error) {
        
    }
   }

   async chooseAllowedPartsByClient(req, res, next){
    try {
        
    } catch (error) {
        
    }
   }

   async createPartOrder(req, res, next){
    try {
        //از بین قطعاتی که مشتری اوکی داده انتخاب میشن و اوردر میشن برای تامین
        await CreatePartOrderSchema.validateAsync(req.body);
        const{title, description, audioFilename, fileUploadPath} = req.body;
        const publisher = req.user._id;
        const garageID = req.user.garageID;
        const clientID = req.params;
        const projectID = req.params;
        await this.findPartOrderById(projectID);
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
        const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`
        const seconds = await audioSeconds(voiceUrl);
        const time = getTime(seconds);

         const addPartOrder = await GaragePartsOrdersModel.create({
            publisher: publisher,
            garageID: garageID,
            clientID: clientID,
            projectID,
            images,
            time,
            voiceAddress,
            title,
            description,
         });
         return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
              message: "درخواست تامین قطعه ثبت شد منتظر دریافت پیشنهاد تامین کنندگان باشید"
            }
        });
    } catch (error) {
        next(error)
    }
   }

   async sendSelectedRequestsToClient(req, res, next){
    try {
        const partorderID = req.params;
        const allSupplyReqs = await this.findPartOrderById(partorderID);
        const {suggestionSupplyRequestsIDs} = req.body.suggestionSupplyRequestsIDs; // ارایه ای از ایدی ها
        const matchingReqs = allSupplyReqs.SupplyRequestsForThisOrder.filter(RequestedForSupply => 
            suggestionSupplyRequestsIDs.includes(RequestedForSupply._id.toString())
            );
        const addSuggestionSupplyReqs = await ProjectsModel.findByIdAndUpdate({_id: projectID},
            {$push: {
                "suggestionSupplyRequests": matchingReqs
            }
        });
     // پیشنهادات مورد نظر مکانیک به فیلد ساجسشن سپلای رکویست اضافه کردیم حالا سمت مشتری 
     // فقط به پروژه کویری میزنیم و اینها رو دریافت میکنیم

     return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data: {
          message: "درخواست های تامین قطعه منتخب به مشتری ارسال شد"
        }
    });

    } catch (error) {
        next(error)
    }
   }

   async notifyThatClientChooseOneSupplyReqs(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }
 

//////////////////////////////////////////////////////////////////////////////////
   async findPartOrderById(partorderID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: partorderID });
    const partOrder = await GaragePartsOrdersModel.findById(id);
    if (!partOrder) throw new createError.NotFound("سفارشی یافت نشد")
    return partOrder
  
     }

 }

module.exports = {
    GaragePartOrdersController: new GaragePartOrdersController()
}