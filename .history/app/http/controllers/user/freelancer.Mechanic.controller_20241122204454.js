const createError = require("http-errors");
const Controller = require("../controller");
const { serialNumGenerator,ListOfImagesFromRequest } = require("../../../utils/functions");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

class MechanicRegistrationController extends Controller {

   async mechanicRegistration(req, res, next) {
      try {
        const { 
          mobile, firstName, lastName, nationalIdNumber, city, province, location, 
          garageName, garageSerialNumber, garageCity, garageAddress, garageLat_Lng, 
          expertices, garageMainField, garageField, sign 
        } = req.body;
    
        // ایجاد یک تراکنش برای اطمینان از یکپارچگی ثبت‌نام
        const result = await prisma.$transaction(async (prisma) => {
          // 1. بررسی وجود کاربر با موبایل وارد شده
          const existingUser = await prisma.user.findUnique({
            where: { mobile },
          });
    
          if (existingUser) {
            throw new Error('کاربری با این شماره موبایل قبلا ثبت نام کرده است.');
          }
    
          // 2. ایجاد کاربر
          const newUser = await prisma.user.create({
            data: {
              mobile,
              password: hashedPassword,
              userProfile: {
                create: {
                  first_name: firstName,
                  last_name: lastName,
                  nationalIdNumber,
                  city,
                  province,
                  location,
                },
              },
              businessProfile: {
                create: {
                  bussinesRole: 'GARAGE_MECHANIC',
                  expertices,
                  referralCodes: serialNumGenerator(),
                },
              },
              userRole: {
                create: {
                  role: {connect: { name: 'MECHANIC'}, },
                },
              },
            },
            include: {
              userProfile: true,
              businessProfile: true,
              userRole: true
            },
          });
    
          // 3. ایجاد گاراژ (در صورت نیاز)
          let newGarage = null;
          if (garageName) {
            newGarage = await prisma.garage.create({
              data: {
                garage_name: garageName,
                garageSerialNumber,
                city: garageCity,
                address: garageAddress,
                lat_lng: garageLat_Lng,
                garageMainField,
                garageField,
                sign,
                ownerId: newUser.businessProfile.id,
              },
            });
    
            // به روز رسانی BusinessProfile با ایدی گاراژ
            await prisma.businessProfile.update({
              where: { id: newUser.businessProfile.id },
              data: { mechanicGarageId: newGarage.id }
            });
          }
    
          // 4. ثبت لاگ فعالیت
          await prisma.userActivity.create({
            data: {
              userId: newUser.id,
              action: 'MECHANIC_REGISTERED',
              metadata: {
                registrationType: 'FULL_PROFILE',
                cityRegistered: city
              }
            }
          });
    
          return { newUser, newGarage };
        }, {
          // تنظیمات اضافی تراکنش
          maxWait: 5000,    // حداکثر زمان انتظار برای قفل
          timeout: 10000    // حداکثر زمان اجرای تراکنش
        });
    
        // 5. پاسخ موفقیت آمیز
        res.status(201).json({
          message: 'ثبت نام مکانیک با موفقیت انجام شد',
          user: {
            id: result.newUser.id,
            mobile: result.newUser.mobile,
            profileName: `${firstName} ${lastName}`,
            garageName: result.newGarage?.garage_name || null
          },
        });
    
      } catch (error) {
        console.error('خطا در ثبت نام مکانیک:', error);
    
        // مدیریت خطاهای مختلف
        if (error.code === 'P2002') {
          return res.status(409).json({ 
            error: 'اطلاعات تکراری وجود دارد' 
          });
        }
    
        res.status(500).json({ 
          error: 'خطای سرور داخلی',
          details: error.message 
        });
      }
    }

   async shagerdRegistration(req, res, next) {
      try {
         const { 
           mobile, firstName, lastName, nationalIdNumber, city, province, location, 
          expertices
         } = req.body;
     
         // ایجاد یک تراکنش برای اطمینان از یکپارچگی ثبت‌نام
         const result = await prisma.$transaction(async (prisma) => {
           // 1. بررسی وجود کاربر با موبایل وارد شده
           const existingUser = await prisma.user.findUnique({
             where: { mobile },
           });
     
           if (existingUser) {
             throw new Error('کاربری با این شماره موبایل قبلا ثبت نام کرده است.');
           }
     
           // 2. ایجاد کاربر
           const newUser = await prisma.user.create({
             data: {
               mobile,
               password: hashedPassword,
               userProfile: {
                 create: {
                   first_name: firstName,
                   last_name: lastName,
                   nationalIdNumber,
                   city,
                   province,
                   location,
                 },
               },
               businessProfile: {
                 create: {
                   bussinesRole: 'GARAGE_APPRENTICE',
                   expertices,
                 },
               },
               userRole: {
                 create: {
                   role: {connect: { name: 'APPRENTICE'}, },
                 },
               },
             },
             include: {
               userProfile: true,
               businessProfile: true,
               userRole: true
             },
           });
     
           // 4. ثبت لاگ فعالیت
           await prisma.userActivity.create({
             data: {
               userId: newUser.id,
               action: 'MECHANIC_REGISTERED',
               metadata: {
                 registrationType: 'FULL_PROFILE',
                 cityRegistered: city
               }
             }
           });
     
           return { newUser, newGarage };
         }, {
           // تنظیمات اضافی تراکنش
           maxWait: 5000,    // حداکثر زمان انتظار برای قفل
           timeout: 10000    // حداکثر زمان اجرای تراکنش
         });
     
         // 5. پاسخ موفقیت آمیز
         res.status(201).json({
           message: 'ثبت نام شما به عنوان شاگرد با موفقیت انجام شد',
           user: {
             id: result.newUser.id,
             mobile: result.newUser.mobile,
             profileName: `${firstName} ${lastName}`,
             garageName: result.newGarage?.garage_name || null
           },
         });
     
       } catch (error) {
         console.error('خطا در عملیات ثبت نام :', error);
     
         // مدیریت خطاهای مختلف
         if (error.code === 'P2002') {
           return res.status(409).json({ 
             error: 'اطلاعات تکراری وجود دارد' 
           });
         }
     
         res.status(500).json({ 
           error: 'خطای سرور داخلی',
           details: error.message 
         });
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
