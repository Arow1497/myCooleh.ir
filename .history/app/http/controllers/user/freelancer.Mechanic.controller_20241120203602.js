const createError = require("http-errors");
const { ROLES } = require("../../../utils/constants");
const Controller = require("../controller");
const { serialNumGenerator, getTime, audioSeconds, ListOfImagesFromRequest } = require("../../../utils/functions");
const { PrismaClient } = require("@prisma/client");
const { ObjectIdValidator } = require("../../validators/public.validator");

const prisma = new PrismaClient();

class MechanicRegistrationController extends Controller {

   async mechanicRegistration(req, res, next) {
      try {
         await MechanicRegistrationSchema.validateAsync(req.body);
         const { first_name, last_name, expertices } = req.body;
         const image = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
         const mechanicID = req.user.id;
         const mechanicReferal = serialNumGenerator();
         const data = {};
         if (first_name) data.first_name = first_name;
         if (last_name) data.last_name = last_name;
         if (expertices) data.expertices = expertices;
         if (image) data.profilePicture = image;
         data.Role = ROLES.MECHANIC;
         data.userReferalNumber = mechanicReferal;

         await prisma.user.update({
            where: { id: mechanicID },
            data: data,
         });

         // ایجاد اشتراک
         const startDate = new Date();
         const endDate = new Date();
         endDate.setMonth(startDate.getMonth() + 1);
         const newSubscription = await prisma.subscription.create({
            data: {
               user: { connect: { id: mechanicID } },
               subscriptionStartDate: startDate,
               subscriptionEndDate: endDate,
               subscriptionType: "free",
            },
         });

         return res.status(201).json({
            statusCode: 201,
            data: {
               message: "استادکار گرامی پروفایل شما با موفقیت بروز رسانی و اشتراک 1 ماهه رایگان برای شما فعال شد",
            },
         });
      } catch (error) {
         next(error);
      }
   }

   async shagerdRegistration(req, res, next) {
      try {
         await MechanicRegistrationSchema.validateAsync(req.body);
         const { first_name, last_name, expertices } = req.body;
         const image = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
         const shagerdID = req.user.id;
         const shagerdReferal = serialNumGenerator();
         const data = {};
         if (first_name) data.first_name = first_name;
         if (last_name) data.last_name = last_name;
         if (expertices) data.expertices = expertices;
         if (image) data.profilePicture = image;
         data.Role = ROLES.SHAGERD;
         data.userReferalNumber = shagerdReferal;

         await prisma.user.update({
            where: { id: shagerdID },
            data: data,
         });

         return res.status(201).json({
            statusCode: 201,
            data: {
               message: "شاگرد گرامی پروفایل شما با موفقیت بروز رسانی شد",
            },
         });
      } catch (error) {
         next(error);
      }
   }
   // تامین کننده قطعه فریلنسر رجیستریشن
   // تامین کننده روغن رجیستریشن
   //برگذار کننده دوره رجیستریشن 
   // متقاضی تبلیغات در بلتفرم رجیستریشن

   async dastyarReqsSendCoWorkingRequestByMechanic(req, res, next) {
      try {
         await CreateDastyarReqsSchema.validateAsync(req.body);
         const { title, message, audioFilename, fileUploadPath } = req.body;
         const publisher = req.user._id;
         const mechanicID = req.user._id;
         const dastyarreqID = req.params.id;
         const findReqs = await this.findDastyarReqById(dastyarreqID);
         const garageID = findReqs.garageID;
         const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
         const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`;
         const seconds = await audioSeconds(voiceUrl);
         const time = getTime(seconds);
         const coWorkRequest = {
            mechanicID,
            garageID,
            publisher,
            title,
            message,
            images,
            dastyarReqsID: dastyarreqID,
            time,
            voiceAddress,
         };

         await prisma.dastyarRequests.update({
            where: { id: dastyarreqID },
            data: {
               mechanicsRequestsForThisReqs: {
                  push: coWorkRequest,
               },
            },
         });

         return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
               message: "ثبت درخواست همکاری با گاراژ با موفقیت انجام شد",
            },
         });
      } catch (error) {
         deleteFilesInPublicForOrders(req.files);
         next(error);
      }
   }

   async apprenticeReqsSendCoWorkingRequestByShagerd(req, res, next) {
      try {
         await CreateDastyarReqsSchema.validateAsync(req.body);
         const { title, message, audioFilename, fileUploadPath } = req.body;
         const publisher = req.user._id;
         const shagerdID = req.user._id;
         const apprenticereqID = req.params.id;
         const findReqs = await this.findApprenticeReqById(apprenticereqID);
         const garageID = findReqs.garageID;
         const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
         const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`;
         const seconds = await audioSeconds(voiceUrl);
         const time = getTime(seconds);
         const coWorkRequest = {
            shagerdID,
            garageID,
            publisher,
            title,
            message,
            images,
            dastyarReqsID: apprenticereqID,
            time,
            voiceAddress,
         };

         await prisma.apprenticeRequests.update({
            where: { id: apprenticereqID },
            data: {
               shagerdsRequestsForThisReqs: {
                  push: coWorkRequest,
               },
            },
         });

         return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
               message: "ثبت درخواست همکاری با گاراژ با موفقیت انجام شد",
            },
         });
      } catch (error) {
         deleteFilesInPublicForOrders(req.files);
         next(error);
      }
   }

   async mechanicMonthlyProjectsIncomeRevenue(req, res, next) {
      try {
         
      } catch (error) {
         next(error);
      }
}// محاسبه و یکجور فیش حقوقی مکانیک یا سرویسکار شاغل در گاراژ برای مشاهده توسط خودش

   async mechanicMonthlyServicesIncomeRevenue(req, res, next) {
      try {
         
      } catch (error) {
         next(error);
      }
}//مجموع درآمد ورودی مکاینیک از سرویس هایی مثل دستیار- کوپن -برونسپاری-دیوار و غیره
// دیتیل و جزییات هرکدوم ازین سرویسها توی بخش مربوط به خودشون در دسترسه
   ////////////////////////////////////////////////////////////////////////////////
   async findDastyarReqById(dastyarreqID) {
      const { id } = await ObjectIdValidator.validateAsync({ id: dastyarreqID });
      const dastyarReqs = await prisma.dastyarRequests.findUnique({
         where: { id: id },
      });
      if (!dastyarReqs) throw new createError.NotFound("چنین آگهی یافت نشد");
      return dastyarReqs;
   }

   async findApprenticeReqById(apprenticereqID) {
      const { id } = await ObjectIdValidator.validateAsync({ id: apprenticereqID });
      const apprenticeReqs = await prisma.apprenticeRequests.findUnique({
         where: { id: id },
      });
      if (!apprenticeReqs) throw new createError.NotFound("چنین آگهی یافت نشد");
      return apprenticeReqs;
   }
}

module.exports = {
   MechanicRegistrationController: new MechanicRegistrationController(),
};
