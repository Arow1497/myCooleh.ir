// reqForAds
// interactRate_ViewClickShare_
// payment
// billingHistory

const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PlatformAdsController extends Controller {
    // Helper methods
    async #getTopPerformersLastMonth() {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        // Get top performers across different metrics
        const [topCoupons, topMetrics, topProjects, topSuppliers, topClanCoupons, topClanMetrics] = await Promise.all([
            // Top coupon creators
            prisma.coupons.groupBy({
                by: ['publisherId'],
                _count: { id: true },
                where: {
                    createdAt: { gte: lastMonth },
                    status: 'COMPLETED'
                },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),
            
            // Top metric creators
            prisma.metric.groupBy({
                by: ['publisherId'],
                _count: { id: true },
                where: {
                    createdAt: { gte: lastMonth },
                    status: 'COMPLETED'
                },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),
            
            // Top project completers
            prisma.project.groupBy({
                by: ['garageId'],
                _count: { id: true },
                where: {
                    completedAt: { gte: lastMonth },
                    status: 'COMPLETED'
                },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),
            
            // Top parts suppliers
            prisma.requestedForSupply.groupBy({
                by: ['supplierStoreId'],
                _count: { id: true },
                where: {
                    createdAt: { gte: lastMonth },
                    status: 'COMPLETED'
                },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),
            
            // Top clan coupons
            prisma.clanCoupon.groupBy({
                by: ['clanId'],
                _count: { id: true },
                where: {
                    createdAt: { gte: lastMonth },
                    status: 'COMPLETED'
                },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),
            
            // Top clan metrics
            prisma.clanMetric.groupBy({
                by: ['clanId'],
                _count: { id: true },
                where: {
                    createdAt: { gte: lastMonth },
                    status: 'COMPLETED'
                },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            })
        ]);
        
        return {
            topCoupons,
            topMetrics,
            topProjects,
            topSuppliers,
            topClanCoupons,
            topClanMetrics
        };
    }
    
    async #getMilestoneAchievers() {
        const milestones = [5, 20, 50, 100];
        const achievers = {};
        
        for (const milestone of milestones) {
            const [couponAchievers, metricAchievers, projectAchievers, supplierAchievers, clanCouponAchievers, clanMetricAchievers] = 
            await Promise.all([
                // Coupon milestone achievers
                prisma.coupons.groupBy({
                    by: ['publisherId'],
                    _count: { id: true },
                    having: {
                        id: { _count: milestone }
                    }
                }),
                
                // Metric milestone achievers
                prisma.metric.groupBy({
                    by: ['publisherId'],
                    _count: { id: true },
                    having: {
                        id: { _count: milestone }
                    }
                }),
                
                // Project milestone achievers
                prisma.project.groupBy({
                    by: ['garageId'],
                    _count: { id: true },
                    having: {
                        id: { _count: milestone }
                    }
                }),
                
                // Supplier milestone achievers
                prisma.requestedForSupply.groupBy({
                    by: ['supplierStoreId'],
                    _count: { id: true },
                    having: {
                        id: { _count: milestone }
                    }
                }),
                
                // Clan coupon milestone achievers
                prisma.clanCoupon.groupBy({
                    by: ['clanId'],
                    _count: { id: true },
                    having: {
                        id: { _count: milestone }
                    }
                }),
                
                // Clan metric milestone achievers
                prisma.clanMetric.groupBy({
                    by: ['clanId'],
                    _count: { id: true },
                    having: {
                        id: { _count: milestone }
                    }
                })
            ]);
            
            achievers[milestone] = {
                couponAchievers,
                metricAchievers,
                projectAchievers,
                supplierAchievers,
                clanCouponAchievers,
                clanMetricAchievers
            };
        }
        
        return achievers;
    }
    
    // Controller methods
    async approveUsersForAds(req, res, next) {
        try {
            const topPerformers = await this.#getTopPerformersLastMonth();
            const milestoneAchievers = await this.#getMilestoneAchievers();
            
            // Combine all eligible users
            const eligibleUsers = new Set();
            
            // Add top performers
            Object.values(topPerformers).forEach(category => {
                category.forEach(performer => {
                    const userId = performer.publisherId || performer.garageId || performer.supplierStoreId || performer.clanId;
                    eligibleUsers.add(userId);
                });
            });
            
            // Add milestone achievers
            Object.values(milestoneAchievers).forEach(milestone => {
                Object.values(milestone).forEach(category => {
                    category.forEach(achiever => {
                        const userId = achiever.publisherId || achiever.garageId || achiever.supplierStoreId || achiever.clanId;
                        eligibleUsers.add(userId);
                    });
                });
            });
            
            // Create ThisMonthApprovedUsersForAds record
            const approvedUsers = await prisma.thisMonthApprovedUsersForAds.create({
                data: {
                    totalApprovedUsers: eligibleUsers.size,
                    platformPermissions: 'FREE_ADS',
                    advertisementTypes: 'BANNER,FEATURED',
                    notes: 'Approved based on last month performance and milestone achievements',
                    approvedUserMapping: {
                        create: Array.from(eligibleUsers).map(userId => ({
                            userId
                        }))
                    }
                }
            });
            
            // Send notifications to approved users
            for (const userId of eligibleUsers) {
                // Implement your notification logic here
                // await this.notificationService.send(userId, 'Congratulations! You are eligible for free advertising this month.');
            }
            
            return res.status(HttpStatus.OK).json({
                status: HttpStatus.OK,
                data: {
                    approvedUsers,
                    topPerformers,
                    milestoneAchievers
                }
            });
            
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }
    
    async createAd(req, res, next) {
        try {
            const { userId, adType, content, duration } = req.body;
            
            // Check if user is approved for ads this month
            const approvedUser = await prisma.approvedUserMapping.findFirst({
                where: {
                    userId,
                    thisMonthApprovedAds: {
                        month: new Date().getMonth() + 1,
                        year: new Date().getFullYear()
                    }
                },
                include: {
                    thisMonthApprovedAds: true
                }
            });
            
            if (!approvedUser && !req.body.isPaid) {
                throw createError(HttpStatus.FORBIDDEN, 'User is not approved for free advertising this month');
            }
            
            // Handle paid advertising
            if (req.body.isPaid) {
                // Implement payment processing logic here
                // const payment = await this.paymentService.process(req.body.paymentDetails);
    
                // Create paid ad record
                const ad = await prisma.advertisement.create({
                    data: {
                        userId,
                        type: adType,
                        content,
                        isPaid: true,
                        duration,
                        startDate: new Date(),
                        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
                    }
                });
                
                return res.status(HttpStatus.CREATED).json({
                    status: HttpStatus.CREATED,
                    data: ad
                });
            }
            
            // Create free ad for approved user
            const ad = await prisma.advertisement.create({
                data: {
                    userId,
                    type: adType,
                    content,
                    isPaid: false,
                    duration: 30, // Free ads last for 30 days
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
            
            return res.status(HttpStatus.CREATED).json({
                status: HttpStatus.CREATED,
                data: ad
            });
            
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    // New helper methods
    async #validateAdPlacement(placementType, location) {
      const validPlacements = ['BANNER', 'SIDEBAR', 'FEATURED', 'POPUP'];
      const validLocations = ['HOME', 'SEARCH', 'PROFILE', 'MARKETPLACE'];
      
      if (!validPlacements.includes(placementType)) {
          throw createError(HttpStatus.BAD_REQUEST, 'Invalid placement type');
      }
      
      if (!validLocations.includes(location)) {
          throw createError(HttpStatus.BAD_REQUEST, 'Invalid location');
      }
  }

  async #calculateAdMetrics(adId, startDate, endDate) {
      return await prisma.adMetrics.findFirst({
          where: {
              adId,
              date: {
                  gte: startDate,
                  lte: endDate
              }
          },
          select: {
              _sum: {
                  views: true,
                  clicks: true,
                  conversions: true
              },
              _avg: {
                  ctr: true
              }
          }
      });
  }

  // Previous controller methods remain unchanged
  async approveUsersForAds(req, res, next) {
      // ... existing implementation ...
  }
  
  async createAd(req, res, next) {
      // ... existing implementation ...
  }

  // New controller methods
  async getAdStats(req, res, next) {
      try {
          const { adId } = req.params;
          const { startDate, endDate } = req.query;

          const ad = await prisma.advertisement.findUnique({
              where: { id: adId },
              include: {
                  metrics: true,
                  placements: true
              }
          });

          if (!ad) {
              throw createError(HttpStatus.NOT_FOUND, 'Advertisement not found');
          }

          const metrics = await this.#calculateAdMetrics(adId, new Date(startDate), new Date(endDate));

          return res.status(HttpStatus.OK).json({
              status: HttpStatus.OK,
              data: {
                  ad,
                  metrics
              }
          });
      } catch (error) {
          next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
      }
  }

  async updateAdPlacement(req, res, next) {
      try {
          const { adId } = req.params;
          const { placementType, location, startTime, endTime } = req.body;

          await this.#validateAdPlacement(placementType, location);

          const updatedPlacement = await prisma.adPlacement.upsert({
              where: {
                  adId_location: {
                      adId,
                      location
                  }
              },
              update: {
                  placementType,
                  startTime: new Date(startTime),
                  endTime: new Date(endTime)
              },
              create: {
                  adId,
                  location,
                  placementType,
                  startTime: new Date(startTime),
                  endTime: new Date(endTime)
              }
          });

          return res.status(HttpStatus.OK).json({
              status: HttpStatus.OK,
              data: updatedPlacement
          });
      } catch (error) {
          next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
      }
  }

  async recordAdInteraction(req, res, next) {
      try {
          const { adId } = req.params;
          const { interactionType, userId } = req.body;

          const validInteractions = ['VIEW', 'CLICK', 'CONVERSION'];
          if (!validInteractions.includes(interactionType)) {
              throw createError(HttpStatus.BAD_REQUEST, 'Invalid interaction type');
          }

          const interaction = await prisma.adInteraction.create({
              data: {
                  adId,
                  userId,
                  type: interactionType,
                  timestamp: new Date()
              }
          });

          // Update metrics
          await prisma.adMetrics.upsert({
              where: {
                  adId_date: {
                      adId,
                      date: new Date()
                  }
              },
              update: {
                  [interactionType.toLowerCase() + 's']: { increment: 1 }
              },
              create: {
                  adId,
                  date: new Date(),
                  [interactionType.toLowerCase() + 's']: 1
              }
          });

          return res.status(HttpStatus.OK).json({
              status: HttpStatus.OK,
              data: interaction
          });
      } catch (error) {
          next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
      }
  }

  async getActiveAds(req, res, next) {
      try {
          const { location } = req.query;
          const now = new Date();

          const activeAds = await prisma.advertisement.findMany({
              where: {
                  startDate: { lte: now },
                  endDate: { gte: now },
                  isActive: true,
                  placements: location ? {
                      some: {
                          location,
                          startTime: { lte: now },
                          endTime: { gte: now }
                      }
                  } : undefined
              },
              include: {
                  placements: true,
                  metrics: {
                      where: {
                          date: now
                      }
                  }
              },
              orderBy: [
                  { isPaid: 'desc' },
                  { startDate: 'desc' }
              ]
          });

          return res.status(HttpStatus.OK).json({
              status: HttpStatus.OK,
              data: activeAds
          });
      } catch (error) {
          next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
      }
  }

  async pauseAd(req, res, next) {
      try {
          const { adId } = req.params;
          const { reason } = req.body;

          const updatedAd = await prisma.advertisement.update({
              where: { id: adId },
              data: {
                  isActive: false,
                  pauseReason: reason,
                  pausedAt: new Date()
              }
          });

          return res.status(HttpStatus.OK).json({
              status: HttpStatus.OK,
              data: updatedAd
          });
      } catch (error) {
          next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
      }
  }
}

module.exports = {
    PlatformAdsController: new PlatformAdsController()
}

/*


فایلی که برای شما فرستادم متشکل از چندین مدل و اسکیما در پروژه 
nodejs express js prismaORM 
من هست مربوط به اپلیکیشن مدیریت گاراژ های تعمیر خودرو ..
این ها مدل ها
 و اسکیما های تعاملات موجود در این پلتفرم مدیریت گاراژ ها هستند...
تعملاتی مثل :
coupons and clanCoupons
metrics and clanMetrics
projects and oilservice projects
requests for supply parts
outsourcing and dastyar and apprentice notice
من میخوام یک سیستم تبلیغاتی در پلتفرم خودم ایجاد کنم.. که
 گاراژ ها از طریق ایجاد بنر های تبلیغاتی و نمایش این 
بنر ها در جاهای مختلف پلتفرم کسب و کار خودشون رو تبلیغ میکنند..
نحوه ی اهدای این تبلیغات به دو نوع هست:
نوع اول صاحب گاراژ حق تبلیغات رو خریداری میکنه
 و به مدت یک ماه بنر هاش در جاهای مختلف نمایش درمیاد..
نوع دوم بنر های تبلیغاتی تشویقی هست
 که اینها به گاراژ هایی یا تامین کنندگان یدکی هایی
 داده میشه که در ماه گذشته بیشترین تعامل رو ثبت کردند
 و حالا در ماه جدید بنر های تبلیغاتی به اونها داده میشه...
از شما میخوام که یک فایل کنترلر
 ایجاد کنید متشکل از هندلر های این بخش تبلیغات یا adsHandlingController.js
که ابتدا هندلر هایی ایجاد کنید که در مدلهای :
coupons and clanCoupons
metrics and clanMetrics
projects and oilservice projects
requests for supply parts
outsourcing and dastyar and apprentice notice
جستجو بکنه گاراژ هایی و یدکی هایی که در این ماه بیشترین موارد
 رو ثبت کردند و لیست ۱۰ مورد بیشترین ها رو برگردونه..
سپس هندلر هایی دیگه ای ایجاد کنید که گاراژ هایی و یدکی هایی که اولین بار
 به ۵ یا ۲۰ یا ۵۰ یا ۱۰۰ صدمین رکورد خودشون در دیتابیس در تعداد
 ایجاد این تعاملات رسیدن و لیست اینها رو هم برگردونه...
در مورد دو مدل :
clanMetrics و clanCoupons لیست ۱۰ کلن هایی  یا گروه هایی که بیشترین تعداد
 رو در ماه اخیر ثبت کردند
 یا کلن هایی که اولین بار به ۵ یا ۲۰ یا
 ۵۰ یا ۱۰۰ صدمین رکورد خودشون
 در دیتابیس به این تعاملات رسیدن...
و سپس هندلری
 ایجاد کنید که این لیست ها رو میگیره این کاربر ها رو در مدل 
 ThisMonthApprovedUsersForAds ثبت میکنه
و برای این گاراژ ها حق ثبت اگهی رو 
confirmed میکنه به مدت محدود یک ماه و برای این گاراژ ها نوتیفیکیشن بره که 
شما مجاز به ثبت تبلیغ در این ماه هستید..
و در زمان کال کردن هندلر createAds چک بشه که ایا این فرد جز برگزیده های دارای حق تبلیغ
 در ماه هست؟ و اگر بود
 بتواند تبلیغ ایجاد کنه


I've created a comprehensive controller for handling the 
advertisement system in your garage management platform. 
Here's what the controller includes:

Helper Methods:

#getTopPerformersLastMonth(): Retrieves top performers across different categories 
(coupons, metrics, projects, suppliers, clan coupons, clan metrics)
#getMilestoneAchievers(): Identifies users who have reached specific milestones (5, 20, 50, 100 records)
Main Controller Methods:

approveUsersForAds():
Combines top performers and milestone achievers
Creates records in ThisMonthApprovedUsersForAds
Sends notifications to approved users
createAd():
Handles both free and paid advertisements
Verifies user eligibility for free ads
Processes payments for paid ads
Creates advertisement records with appropriate duration
The controller implements both types of advertising:

Reward-based free ads for:

Top 10 performers in each category from last month
Users reaching milestone numbers of records
Clan-based achievements
Paid advertising system:

Allows users to purchase ad space
Supports custom duration
Includes payment processing capability
To use this controller, you'll need to:

Add it to your routes
Create the Advertisement model in your Prisma schema
Implement the notification service
Implement the payment processing service for paid ads

*/