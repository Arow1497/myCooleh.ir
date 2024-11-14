const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime, audioSeconds, getLink } = require("../../../../utils/functions");
const { garagesSchema } = require("../../../validators/MainApp/garages.schema");
const { serialNumGenerator, ListOfImagesFromRequest, deleteFileInPublic } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");

class GarageManagementController extends Controller{
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
    async garageMonthlyProjectsIncomeRevenue(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }


    async garageMonthlyServicesIncomeRevenue(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }//مجموع درآمد ورودی از سرویس هایی مثل کوپن -متریک -تامین قطعه درصدی- برونسپاری-دیوار و غیره
    // دیتیل و جزییات هرکدوم ازین سرویسها توی بخش مربوط به خودشون در دسترسه

    async getGarageMechanicsList(req, res, next){
        try {
            const garageID = req.user.GarageID;
            if(!garageID) throw createError.NotAcceptable("هنوز گاراژی ثبت نکرده اید")
            // const findMechanicsList = await GaragesModel.findById(garageID)   
        garageID.populate({
                path: "mechanicsTeam",
                select: "mechanicsTeam",
            })
            .select("mechanicsTeam")
            .exec();

            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data : {
                    findMechanicsList
                }
            });
        } catch (error) {
            next(error)
        }
    } 

    async getGarageShagerdsList(req, res, next){
        try {
            const garageID = req.user.GarageID;
            if(!garageID) throw createError.NotAcceptable("هنوز گاراژی ثبت نکرده اید")
            // const findShagerdsList = await GaragesModel.findById(garageID)   
            garageID.populate({
                path: "shagerds",
                select: "shagerds",
            })
            .select("shagerds")
            .exec();

            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data : {
                    findShagerdsList
                }
            });
        } catch (error) {
            next(error)
        }
    } 

    async mechanicMonthlyPercentageCheckOut(req, res, next){
        try {
            const mechanicId = req.params.mechanicId;
            const { year, month } = req.query;
    
            // تبدیل تاریخ شروع و پایان ماه شمسی به میلادی
            const startOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').startOf('jMonth').toDate();
            const endOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').endOf('jMonth').toDate();
    
            // پیدا کردن پروژه‌هایی که مکانیک در آن‌ها مشارکت داشته و دستمزدش محاسبه نشده
            const projects = await ProjectsModel.find({
                mechanicsTeam: mongoose.Types.ObjectId(mechanicId),
                'mechanicsCalculatedSalaries.mechanicId': { $ne: mongoose.Types.ObjectId(mechanicId) }, // پروژه‌هایی که برای این مکانیک محاسبه نشده‌اند
                createdAt: { $gte: startOfMonth, $lte: endOfMonth } // پروژه‌هایی که در ماه انتخابی ایجاد شده‌اند
            });
    
            // محاسبه 20 درصد از مبلغ هر پروژه و جمع زدن آن
            const totalSalary = projects
                .map(project => parseFloat(project.price) * 0.2) // محاسبه 20 درصد
                .reduce((acc, salary) => acc + salary, 0); // جمع زدن تمام دستمزدها
    
            // به‌روزرسانی وضعیت محاسبه دستمزد برای این مکانیک در پروژه‌های محاسبه‌شده
            for (const project of projects) {
                await ProjectsModel.updateOne(
                    { _id: project._id },
                    { $push: { calculatedSalaries: { mechanicId, isCalculated: true } } }
                );
            }
    
            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data:{
                mechanicId,
                totalSalary: totalSalary.toFixed(2), // مقدار نهایی به صورت یک عدد با دو رقم اعشار
                year,
                month}
            });
        } catch (error) {
            next(error)
        }
    } 
    //نحوه استفاده
// در این رویکرد، صاحب گاراژ می‌تواند با ارسال پارامترهای year و month
//  از طریق کوئری استرینگ، ماه شمسی مورد نظر خود را برای محاسبه دستمزد مکانیک‌ها انتخاب کند
//  به‌عنوان مثال، اگر بخواهد دستمزد مکانیک‌ها برای ماه اردیبهشت 1403 محاسبه شود، می‌تواند چنین درخواستی ارسال کند:
// GET /mechanics/:mechanicId/salary?year=1403&month=2

    async shagerdMonthlyPercentageCheckOut(req, res, next){
        try {
            const shagerdID = req.params.shagerdID;
            const { year, month } = req.query;
    
            // تبدیل تاریخ شروع و پایان ماه شمسی به میلادی
            const startOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').startOf('jMonth').toDate();
            const endOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').endOf('jMonth').toDate();
    
            // پیدا کردن پروژه‌هایی که مکانیک در آن‌ها مشارکت داشته و دستمزدش محاسبه نشده
            const projects = await ProjectsModel.find({
                shagerdsTeam: mongoose.Types.ObjectId(shagerdID),
                'shagerdsCalculatedSalaries.shagerdID': { $ne: mongoose.Types.ObjectId(shagerdID) }, // پروژه‌هایی که برای این مکانیک محاسبه نشده‌اند
                createdAt: { $gte: startOfMonth, $lte: endOfMonth } // پروژه‌هایی که در ماه انتخابی ایجاد شده‌اند
            });
    
            // محاسبه 5 درصد از مبلغ هر پروژه و جمع زدن آن
            const totalSalary = projects
                .map(project => parseFloat(project.price) * 0.05) // محاسبه 5 درصد
                .reduce((acc, salary) => acc + salary, 0); // جمع زدن تمام دستمزدها
    
            // به‌روزرسانی وضعیت محاسبه دستمزد برای این مکانیک در پروژه‌های محاسبه‌شده
            for (const project of projects) {
                await ProjectsModel.updateOne(
                    { _id: project._id },
                    { $push: { calculatedSalaries: { shagerdID, isCalculated: true } } }
                );
            }
    
            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data:{
                shagerdID,
                totalSalary: totalSalary.toFixed(2), // مقدار نهایی به صورت یک عدد با دو رقم اعشار
                year,
                month}
            });
        } catch (error) {
            next(error)
        }
    }    //نحوه استفاده
    // در این رویکرد، صاحب گاراژ می‌تواند با ارسال پارامترهای year و month
    //  از طریق کوئری استرینگ، ماه شمسی مورد نظر خود را برای محاسبه دستمزد مکانیک‌ها انتخاب کند
    //  به‌عنوان مثال، اگر بخواهد دستمزد مکانیک‌ها برای ماه اردیبهشت 1403 محاسبه شود، می‌تواند چنین درخواستی ارسال کند:
    // GET /mechanics/:mechanicId/salary?year=1403&month=2


}
module.exports = {
    GarageManagementController: new GarageManagementController()
}