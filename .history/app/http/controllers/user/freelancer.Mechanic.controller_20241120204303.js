const createError = require("http-errors");
const { ROLES } = require("../../../utils/constants");
const Controller = require("../controller");
const { serialNumGenerator,ListOfImagesFromRequest } = require("../../../utils/functions");
const { PrismaClient } = require("@prisma/client");

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
   /*
   تامین کننده قطعه فریلنسر رجیستریشن
   تامین کننده روغن رجیستریشن
   برگذار کننده دوره رجیستریشن 
   متقاضی تبلیغات در بلتفرم رجیستریشن
   */

   async mechanicMonthlyProjectsIncomeRevenue(req, res, next) {
      try {
         
      } catch (error) {
         next(error);
      }
}
// محاسبه و یکجور فیش حقوقی مکانیک یا سرویسکار شاغل در گاراژ برای مشاهده توسط خودش

   async mechanicMonthlyServicesIncomeRevenue(req, res, next) {
      try {
         
      } catch (error) {
         next(error);
      }
}
/*
مجموع درآمد ورودی مکاینیک از سرویس هایی مثل دستیار- کوپن -برونسپاری-دیوار و غیره
دیتیل و جزییات هرکدوم ازین سرویسها توی بخش مربوط به خودشون در دسترسه
*/
   ////////////////////////////////////////////////////////////////////////////////

}

module.exports = {
   MechanicRegistrationController: new MechanicRegistrationController(),
};
