const createError = require("http-errors");
const Controller = require("../controller");
const { serialNumGenerator } = require("../../../utils/functions");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

class MechanicRegistrationController extends Controller {

   async mechanicRegistration(req, res, next) {
      try {
        //this is including freelancers
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
          const newUser = await prisma.user.update({
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
              data: { 
               ownedGarage: {
                  connect: {
                     id: newGarage.id,
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
        next(error);
      }
    }

   async apprenticeRegistration(req, res, next) {
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
           const newUser = await prisma.user.update({
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
        next(error);
       }
     }
   /*
   تامین کننده قطعه فریلنسر رجیستریشن
   تامین کننده روغن رجیستریشن
   برگذار کننده دوره رجیستریشن 
   متقاضی تبلیغات در بلتفرم رجیستریشن
   */

   async dontWorkInThisGarageAnyMoreByMechanic(req, res, next) {
    try {
        //استعفا از گاراژ - حذف گاراژ
    } catch (error) {
        next(error);
    }
    }

    async dontWorkInThisGarageAnyMoreByApprentice(req, res, next) {
      try {
          //استعفا از گاراژ - حذف گاراژ
      } catch (error) {
          next(error);
      }
      }
      
    async updateMechanicProfile(req, res, next) {
    try {
        
    } catch (error) {
        next(error);
    }
    }

    async updateAprenticeProfile(req, res, next) {
      try {
        
      } catch (error) {
        next(error);
      }
    }
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


  async registerMechanic(req, res) {
    const {
      mobile,
      firstName,
      lastName,
      nationalIdNumber,
      city,
      expertices,
      mechanicPercentage,
    } = req.body;

    try {
      const result = await prisma.$transaction(async (prisma) => {
        // Check if mobile already exists
        const existingUser = await prisma.user.findUnique({
          where: { mobile }
        });

        if (existingUser) {
          throw new Error('Mobile number already registered');
        }

        // Create new user with mechanic role
        const user = await prisma.user.create({
          data: {
            mobile,
            isActive: true,
            userProfile: {
              create: {
                first_name: firstName,
                last_name: lastName,
                nationalIdNumber,
                city,
              }
            },
            businessProfile: {
              create: {
                expertices,
                mechanicPercentage,
                bussinesRole: 'GARAGE_MECHANIC',
              }
            }
          }
        });

        // Assign mechanic role
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: 'MECHANIC_ROLE_ID' // Replace with actual role ID
          }
        });

        return user;
      });

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update/Delete Garage
  async updateGarage(req, res) {
    const { garageId } = req.params;
    const {
      garage_name,
      city,
      telephone,
      address,
      lat_lng,
      garageMainField,
      isDelete = false
    } = req.body;

    try {
      const result = await prisma.$transaction(async (prisma) => {
        const garage = await prisma.garage.findUnique({
          where: { id: garageId }
        });

        if (!garage) {
          throw new Error('Garage not found');
        }

        if (isDelete) {
          // Check if garage has active projects
          const activeProjects = await prisma.project.count({
            where: {
              garageId,
              status: 'INPROGRESS'
            }
          });

          if (activeProjects > 0) {
            throw new Error('Cannot delete garage with active projects');
          }

          // Remove all mechanics and apprentices associations
          await prisma.businessProfile.updateMany({
            where: {
              OR: [
                { mechanicGarageId: garageId },
                { apprenticeGarageId: garageId }
              ]
            },
            data: {
              mechanicGarageId: null,
              apprenticeGarageId: null
            }
          });

          return await prisma.garage.delete({
            where: { id: garageId }
          });
        }

        // Update garage
        return await prisma.garage.update({
          where: { id: garageId },
          data: {
            garage_name,
            city,
            telephone,
            address,
            lat_lng,
            garageMainField,
            updatedAt: new Date()
          }
        });
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add mechanic to garage by mobile
  async addMechanicToGarage(req, res) {
    const { garageId } = req.params;
    const { mechanicMobile } = req.body;

    try {
      const result = await prisma.$transaction(async (prisma) => {
        // Find mechanic by mobile
        const mechanic = await prisma.user.findUnique({
          where: { mobile: mechanicMobile },
          include: {
            businessProfile: true,
            userRole: true
          }
        });

        if (!mechanic) {
          throw new Error('Mechanic not found');
        }

        // Verify user is a mechanic
        const isMechanic = mechanic.userRole.some(role => role.roleId === 'MECHANIC_ROLE_ID');
        if (!isMechanic) {
          throw new Error('User is not a mechanic');
        }

        // Check if mechanic is already assigned to a garage
        if (mechanic.businessProfile.mechanicGarageId) {
          throw new Error('Mechanic is already assigned to a garage');
        }

        // Update mechanic's garage association
        return await prisma.businessProfile.update({
          where: { id: mechanic.businessProfile.id },
          data: {
            mechanicGarageId: garageId
          }
        });
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Calculate mechanic's monthly salary
  async calculateMechanicSalary(req, res) {
    const { mechanicId, month, year } = req.params;

    try {
      const result = await prisma.$transaction(async (prisma) => {
        // Get mechanic's details
        const mechanic = await prisma.businessProfile.findUnique({
          where: { id: mechanicId },
          include: {
            inProgressProjectMechanic: {
              where: {
                completedAt: {
                  gte: new Date(year, month - 1, 1),
                  lt: new Date(year, month, 1)
                },
                status: 'SUPPLIED'
              },
              include: {
                project: true
              }
            }
          }
        });

        if (!mechanic) {
          throw new Error('Mechanic not found');
        }

        // Calculate total earnings from completed projects
        let totalEarnings = 0;
        for (const project of mechanic.inProgressProjectMechanic) {
          const projectCost = parseFloat(project.project.totalCost);
          const mechanicPercentage = parseFloat(mechanic.mechanicPercentage) / 100;
          totalEarnings += projectCost * mechanicPercentage;
        }

        // Get project statistics
        const projectStats = {
          totalProjects: mechanic.inProgressProjectMechanic.length,
          completedProjects: mechanic.inProgressProjectMechanic.filter(p => p.status === 'SUPPLIED').length,
          totalEarnings: totalEarnings
        };

        return {
          mechanicId,
          month,
          year,
          ...projectStats
        };
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update mechanic profile
  async updateMechanicProfile(req, res) {
    const { mechanicId } = req.params;
    const {
      firstName,
      lastName,
      nationalIdNumber,
      bankAccountNumber,
      province,
      city,
      location,
      website,
      socialLinks,
      expertices,
      mechanicPercentage
    } = req.body;

    try {
      const result = await prisma.$transaction(async (prisma) => {
        // Check if mechanic exists
        const mechanic = await prisma.user.findUnique({
          where: { id: mechanicId },
          include: {
            userProfile: true,
            businessProfile: true,
            socialProfile: true
          }
        });

        if (!mechanic) {
          throw new Error('Mechanic not found');
        }

        // Update userProfile
        await prisma.userProfile.update({
          where: { userId: mechanicId },
          data: {
            first_name: firstName,
            last_name: lastName,
            nationalIdNumber,
            bankAccountNumber,
            province,
            city,
            location
          }
        });

        // Update businessProfile
        await prisma.businessProfile.update({
          where: { userId: mechanicId },
          data: {
            expertices,
            mechanicPercentage
          }
        });

        // Update socialProfile
        await prisma.socialProfile.update({
          where: { userId: mechanicId },
          data: {
            website,
            socialLinks
          }
        });

        // Get updated mechanic data
        return await prisma.user.findUnique({
          where: { id: mechanicId },
          include: {
            userProfile: true,
            businessProfile: true,
            socialProfile: true
          }
        });
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Additional helper methods
  async _validateMechanicRole(userId) {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId: 'MECHANIC_ROLE_ID'
      }
    });
    return !!userRole;
  }

  async _checkGarageCapacity(garageId) {
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
      include: {
        mechanics: true
      }
    });

    // Get garage's subscription plan limits
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: garage.ownerId
      },
      include: {
        plan: true
      }
    });

    if (!subscription) {
      throw new Error('Garage has no active subscription');
    }

    const maxMechanics = parseInt(subscription.plan.maxMechanics);
    if (garage.mechanics.length >= maxMechanics) {
      throw new Error(`Garage has reached maximum mechanic capacity of ${maxMechanics}`);
    }
  }
}



module.exports = {
   MechanicRegistrationController: new MechanicRegistrationController(),
};
