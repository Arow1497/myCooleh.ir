const createHttpError = require('http-errors');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Controller = require('../../../controller');

class UserActivityController extends Controller {
    
    // دریافت لیست کاربران غیرفعال در X روز گذشته
    async getInactiveUsers(req, res, next) {
        try {
            const { days = 7 } = req.query;
            const inactiveDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const inactiveUsers = await prisma.user.findMany({
                where: {
                    lastActiveAt: {
                        lt: inactiveDate
                    },
                    isActive: true
                },
                include: {
                    profile: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    users: inactiveUsers,
                    count: inactiveUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت کاربران جدید در هفته گذشته
    async getNewUsers(req, res, next) {
        try {
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const newUsers = await prisma.user.findMany({
                where: {
                    registrationDate: {
                        gte: lastWeek
                    }
                },
                include: {
                    profile: true
                },
                orderBy: {
                    registrationDate: 'desc'
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    users: newUsers,
                    count: newUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت کاربران ثبت‌نام شده بدون فعالیت
    async getInactiveNewUsers(req, res, next) {
        try {
            const { days = 7 } = req.query;
            const checkDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const inactiveNewUsers = await prisma.user.findMany({
                where: {
                    registrationDate: {
                        lte: checkDate
                    },
                    UserActivity: {
                        none: {}
                    }
                },
                include: {
                    profile: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    users: inactiveNewUsers,
                    count: inactiveNewUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت آمار فعالیت‌های کاربران در بازه زمانی مشخص
    async getUserActivityStats(req, res, next) {
        try {
            const { startDate, endDate, activityType } = req.query;
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            const whereClause = {
                createdAt: {
                    gte: start,
                    lte: end
                }
            };

            if (activityType) {
                whereClause.type = activityType;
            }

            const activities = await prisma.userActivity.groupBy({
                by: ['type'],
                where: whereClause,
                _count: {
                    type: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    activities,
                    timeRange: {
                        start,
                        end
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت کاربران آنلاین فعلی
    async getCurrentOnlineUsers(req, res, next) {
        try {
            const timeThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

            const onlineUsers = await prisma.user.findMany({
                where: {
                    lastActiveAt: {
                        gte: timeThreshold
                    },
                    isActive: true
                },
                include: {
                    profile: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    users: onlineUsers,
                    count: onlineUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت گزارش فعالیت‌های مشکوک
    async getSuspiciousActivities(req, res, next) {
        try {
            const { hours = 24 } = req.query;
            const checkDate = new Date(Date.now() - hours * 60 * 60 * 1000);

            const suspiciousActivities = await prisma.userActivity.findMany({
                where: {
                    OR: [
                        {
                            type: 'FAILED_LOGIN',
                            createdAt: {
                                gte: checkDate
                            }
                        },
                        {
                            type: 'PERMISSION_DENIED',
                            createdAt: {
                                gte: checkDate
                            }
                        }
                    ]
                },
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    activities: suspiciousActivities,
                    count: suspiciousActivities.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت آمار فعالیت کاربر خاص
    async getUserActivityHistory(req, res, next) {
        try {
            const { userId } = req.params;
            const { days = 30 } = req.query;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const activities = await prisma.userActivity.findMany({
                where: {
                    userId: parseInt(userId),
                    createdAt: {
                        gte: startDate
                    }
                },
                include: {
                    session: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // محاسبه آمار فعالیت‌ها
            const activityStats = await prisma.userActivity.groupBy({
                by: ['type'],
                where: {
                    userId: parseInt(userId),
                    createdAt: {
                        gte: startDate
                    }
                },
                _count: {
                    type: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    activities,
                    stats: activityStats,
                    totalActivities: activities.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

     // دریافت مکانیک‌های فعال بر اساس تعداد پروژه‌های انجام شده
     async getActiveMechanics(req, res, next) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const activeMechanics = await prisma.user.findMany({
                where: {
                    bussinesRole: 'GARAGE_MECHANIC',
                    inProgressProjectMechanic: {
                        some: {
                            createdAt: {
                                gte: startDate
                            }
                        }
                    }
                },
                include: {
                    profile: true,
                    _count: {
                        select: {
                            inProgressProjectMechanic: true
                        }
                    }
                },
                orderBy: {
                    inProgressProjectMechanic: {
                        _count: 'desc'
                    }
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    mechanics: activeMechanics,
                    count: activeMechanics.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت آمار فعالیت‌های گاراژها بر اساس منطقه
    async getGarageActivityByRegion(req, res, next) {
        try {
            const garageStats = await prisma.garage.groupBy({
                by: ['city'],
                _count: {
                    id: true
                },
                _sum: {
                    projectCount: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    regionStats: garageStats
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت کاربران با بیشترین تعامل (لایک، کامنت، بوکمارک)
    async getMostEngagedUsers(req, res, next) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const engagedUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        {
                            likes: {
                                some: {
                                    createdAt: {
                                        gte: startDate
                                    }
                                }
                            }
                        },
                        {
                            comments: {
                                some: {
                                    createdAt: {
                                        gte: startDate
                                    }
                                }
                            }
                        },
                        {
                            bookmarks: {
                                some: {
                                    createdAt: {
                                        gte: startDate
                                    }
                                }
                            }
                        }
                    ]
                },
                include: {
                    profile: true,
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                            bookmarks: true
                        }
                    }
                },
                orderBy: {
                    likes: {
                        _count: 'desc'
                    }
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    users: engagedUsers
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت آمار استفاده از کوپن‌ها
    async getCouponUsageStats(req, res, next) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const couponStats = await prisma.coupons.groupBy({
                by: ['userId'],
                where: {
                    createdAt: {
                        gte: startDate
                    }
                },
                _count: {
                    id: true
                }
            });

            const successfulCoupons = await prisma.couponMechanicSuccess.findMany({
                where: {
                    createdAt: {
                        gte: startDate
                    }
                },
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    }
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    couponStats,
                    successfulCoupons,
                    totalSuccessful: successfulCoupons.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // دریافت کاربران با بیشترین درخواست‌های همکاری
    async getTopCollaborators(req, res, next) {
        try {
            const collaborators = await prisma.user.findMany({
                where: {
                    OR: [
                        {
                            garageReqForOutSource: {
                                isNot: null
                            }
                        },
                        {
                            garageOwnerReqsForApprentice: {
                                isNot: null
                            }
                        },
                        {
                            garageOwnerReqsForMechanic: {
                                isNot: null
                            }
                        }
                    ]
                },
                include: {
                    profile: true,
                    garageReqForOutSource: true,
                    garageOwnerReqsForApprentice: true,
                    garageOwnerReqsForMechanic: true
                }
            });

            return res.status(200).json({
                statusCode: 200,
                data: {
                    collaborators,
                    count: collaborators.length
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    UserActivityController: new UserActivityController()
};


//به غیر از ابزار تحلیل اپلییشن و پلتفرم مثل فایربیس و پرومتوس و غیره ما یکسری تکه کد و ای پی آی 
// تعریف میکنیم و اینجا مینویسیم که با کال شدنشون مثلا یوزر هایی که تازگی جوین پلتفرم شدن ولی 
//فعالیت ندارن و اکتیو نیستن رو برمیگردونه تا باهاشون تماس بگیریم و فیچر های اپ رو توضیح بدیم یا
//اینکه یوزر هایی که امروز رجیستر کردن رو مثلا برمیگردونه تا پشتیبانی تماس بگیره و از فعالیتشون مطمین بشه
//و...


