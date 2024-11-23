const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { garagesSchema } = require("../../validators/MainApp/garages.schema");
const { serialNumGenerator } = require("../../../utils/functions");

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

// Controller methods
  async supplierRegistration(req, res, next) {
    try {
      //this is including freelancers
      const { 
        mobile, firstName, lastName, nationalIdNumber, city, province, location, 
        supplierStoreName, supplierStoreSerialNumber, supplierStoreCity, supplierStoreAddress, supplierStoreLat_Lng, 
        expertices, supplierStoreMainField, supplierStoreField, sign 
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
                bussinesRole: 'SUPPLIER',
                expertices,
                referralCodes: serialNumGenerator(),
              },
            },
            userRole: {
              create: {
                role: {connect: { name: 'SUPPLIER'}, },
              },
            },
          },
          include: {
            userProfile: true,
            businessProfile: true,
            userRole: true
          },
        });

        // 3. ایجاد یدکی (در صورت نیاز)
        let newSupplierStore = null;
        if (supplierStoreName) {
          newSupplierStore = await prisma.supplierStore.create({
            data: {
              supplierStore_name: supplierStoreName,
              supplierStoreSerialNumber,
              city: supplierStoreCity,
              address: supplierStoreAddress,
              lat_lng: supplierStoreLat_Lng,
              supplierStoreMainField,
              supplierStoreField,
              sign,
              ownerId: newUser.businessProfile.id,
            },
          });

          // به روز رسانی BusinessProfile با ایدی یدکی
          await prisma.businessProfile.update({
            where: { id: newUser.businessProfile.id },
            data: { 
            ownedSupplierStore: {
                connect: {
                  id: newSupplierStore.id,
                },
            },
          },
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

        return { newUser, newSupplierStore };
      }, {
        // تنظیمات اضافی تراکنش
        maxWait: 5000,    // حداکثر زمان انتظار برای قفل
        timeout: 10000    // حداکثر زمان اجرای تراکنش
      });

      // 5. پاسخ موفقیت آمیز
      res.status(201).json({
        message: 'ثبت نام تامین کننده با موفقیت انجام شد',
        user: {
          id: result.newUser.id,
          mobile: result.newUser.mobile,
          profileName: `${firstName} ${lastName}`,
          supplierStoreName: result.newSupplierStore?.supplierStore_name || null
        },
      });

    } catch (error) {
      console.error('خطا در ثبت نام تامین کننده:', error);

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


  async updateSupplierStoreById (req, res, next){
  try {
    
  } catch (error) {
    
  }
  
}

  async deleteSupplierStoreById (req, res, next){
   try {
     
   } catch (error) {
     
   }
  }
  
  async createSquadesCoupons (req, res, next){
    try {
      
    } catch (error) {
      
    }
   }

   async successfulCouponsSellInSquade (req, res, next){
    try {
      
    } catch (error) {
      
    }
   }

   async coWorkReportsWitEachOfSquadeMembers (req, res, next){
    try {
      
    } catch (error) {
      
    }
   }

   async monthlyReportOfSquadeSupplyActivity (req, res, next){
    try {
      
    } catch (error) {
      
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