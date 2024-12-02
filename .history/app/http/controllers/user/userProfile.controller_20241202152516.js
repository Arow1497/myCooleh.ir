const createError = require("http-errors");
const Controller = require("../controller");


class UserProfileController extends Controller{

    async clickOnUserProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const userProfile = await prisma.user.findUnique({
                where: { id: userId,
                include: {
                    userProfile: true,
                    businessProfile: {
                        include: {
                            ownedSupplierStore: true,
                            ownedGarage: true,
                            mechanicAt: true,
                            apprenticeAt: true,
                        },
                    },
                    projectProfile: {
                        include: {
                            inProgressProjectMechanic: true,
                            inProgressProjectApprentice: true,
                            publishedmetrics: true,
                        },
                    },
                    socialProfile: {
                        include: {
                            posts: true,
                            reviews: true,
                            receivedReviews: true,
                        },
                    },
                    activityProfile: true,
                },
            },
            });

            if (!userProfile) throw createError.NotFound("کاربر یافت نشد");

            return res.status(200).json({
                status: 200,
                success: true,
                data: userProfile,
            });
        } catch (error) {
            next(error);
        }
    }


      // Get complete user profile with all related information
      async getFullProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const userProfile = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    userProfile: true,
                    businessProfile: {
                        include: {
                            ownedSupplierStore: true,
                            ownedGarage: true,
                            mechanicAt: true,
                            apprenticeAt: true,
                        }
                    },
                    projectProfile: {
                        include: {
                            inProgressProjectMechanic: true,
                            inProgressProjectApprentice: true,
                            publishedmetrics: true,
                        }
                    },
                    socialProfile: {
                        include: {
                            posts: true,
                            reviews: true,
                            receivedReviews: true,
                        }
                    },
                    activityProfile: true,
                }
            });

            if (!userProfile) throw createError.NotFound("کاربر یافت نشد");

            return res.status(200).json({
                status: 200,
                success: true,
                data: userProfile
            });
        } catch (error) {
            next(error);
        }
    }

    // Update basic user profile information
    async updateBasicInfo(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                first_name,
                last_name,
                nationalIdNumber,
                bankAccountNumber,
                province,
                city,
                location,
                website,
                socialLinks
            } = req.body;

            const updatedProfile = await prisma.userProfile.upsert({
                where: { userId },
                update: {
                    first_name,
                    last_name,
                    nationalIdNumber,
                    bankAccountNumber,
                    province,
                    city,
                    location,
                    website,
                    socialLinks
                },
                create: {
                    userId,
                    first_name,
                    last_name,
                    nationalIdNumber,
                    bankAccountNumber,
                    province,
                    city,
                    location,
                    website,
                    socialLinks
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: updatedProfile
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user business metrics and statistics
    async getBusinessMetrics(req, res, next) {
        try {
            const userId = req.user.id;
            const metrics = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    reputation: true,
                    totalTransactions: true,
                    successRate: true,
                    supplierRating: true,
                    responseTime: true,
                    qualityScore: true,
                    businessProfile: {
                        select: {
                            referralCount: true,
                            profit: true,
                            league: true
                        }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: metrics
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's recent activities
    async getRecentActivities(req, res, next) {
        try {
            const userId = req.user.id;
            const activities = await prisma.activityProfile.findUnique({
                where: { userId },
                include: {
                    activities: {
                        take: 10,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: activities
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's social interactions
    async getSocialInteractions(req, res, next) {
        try {
            const userId = req.user.id;
            const socialData = await prisma.socialProfile.findUnique({
                where: { userId },
                include: {
                    posts: {
                        take: 5,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    },
                    reviews: {
                        take: 5,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    },
                    receivedReviews: {
                        take: 5,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: socialData
            });
        } catch (error) {
            next(error);
        }
    }

    // Update profile images
    async updateProfileImages(req, res, next) {
        try {
            const userId = req.user.id;
            const { profileImageUrl, coverImageUrl } = req.body;

            const updatedImages = await prisma.userProfile.update({
                where: { userId },
                data: {
                    profileImageUrl,
                    coverImageUrl
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: updatedImages
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's business roles and expertise
    async getBusinessRoles(req, res, next) {
        try {
            const userId = req.user.id;
            const businessRoles = await prisma.businessProfile.findUnique({
                where: { userId },
                select: {
                    mechanicPercentage: true,
                    apprenticePercentage: true,
                    bussinesRole: true,
                    expertices: true,
                    ownedSupplierStore: true,
                    ownedGarage: true,
                    mechanicAt: true,
                    apprenticeAt: true
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: businessRoles
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's project history
    async getProjectHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const projects = await prisma.projectProfile.findUnique({
                where: { userId },
                include: {
                    inProgressProjectMechanic: true,
                    inProgressProjectApprentice: true,
                    projectProvider: true,
                    projectRequester: true,
                    publishedmetrics: true
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: projects
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's clan information and status
    async getClanDetails(req, res, next) {
        try {
            const userId = req.user.id;
            const clanInfo = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    ownedClan: true,
                    memberships: {
                        include: {
                            clan: true
                        }
                    },
                    joinRequests: {
                        where: {
                            status: 'PENDING'
                        }
                    },
                    receivedInvites: {
                        where: {
                            status: 'PENDING'
                        },
                        include: {
                            clan: true
                        }
                    },
                    activities: {
                        take: 10,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: clanInfo
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's social content (posts, comments, interactions)
    async getSocialContent(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const socialContent = await prisma.socialProfile.findUnique({
                where: { userId },
                select: {
                    posts: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' },
                        include: {
                            comments: {
                                include: {
                                    likes: true,
                                    dislikes: true
                                }
                            },
                            likes: true,
                            shares: true
                        }
                    },
                    comments: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' },
                        include: {
                            commentvote: true
                        }
                    },
                    reactions: true
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: socialContent
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's bookmarks
    async getBookmarks(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const bookmarks = await prisma.socialProfile.findUnique({
                where: { userId },
                select: {
                    bookmarks: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' },
                        include: {
                            post: {
                                include: {
                                    user: {
                                        select: {
                                            userProfile: {
                                                select: {
                                                    first_name: true,
                                                    last_name: true,
                                                    profileImageUrl: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: bookmarks
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's subscription status and details
    async getSubscriptionStatus(req, res, next) {
        try {
            const userId = req.user.id;
            const subscriptionInfo = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    subscriptionStatus: true,
                    subscriptions: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            plan: true,
                            payments: {
                                orderBy: { createdAt: 'desc' },
                                take: 1
                            }
                        }
                    }
                }
            });

            // Calculate remaining time if active subscription exists
            let remainingDays = 0;
            if (subscriptionInfo.subscriptions[0]) {
                const endDate = new Date(subscriptionInfo.subscriptions[0].endDate);
                const today = new Date();
                remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            }

            return res.status(200).json({
                status: 200,
                success: true,
                data: {
                    ...subscriptionInfo,
                    remainingDays
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's coupons and purchased products
    async getPurchaseHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const purchaseHistory = await prisma.projectProfile.findUnique({
                where: { userId },
                select: {
                    acceptedCoupons: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' },
                        include: {
                            coupon: true
                        }
                    },
                    successCoupons: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' },
                        include: {
                            coupon: true
                        }
                    },
                    garagePartOrder: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' }
                    },
                    sellFromSupplier: {
                        skip,
                        take: Number(limit),
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: purchaseHistory
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's notice board (apprenticeship & dastyar notices)
    async getNoticeBoard(req, res, next) {
        try {
            const userId = req.user.id;
            const notices = await prisma.projectProfile.findUnique({
                where: { userId },
                select: {
                    apprenticeNoticesPublisher: true,
                    apprenticeNoticesApprentice: true,
                    dastyarNoticesPublisher: true,
                    dastyarNoticesMechanic: true,
                    garageOwnerReqsForApprentice: true,
                    garageOwnerReqsForMechanic: true,
                    mechanicReadyToWork: true
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: notices
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's referral and reward status
    async getReferralStatus(req, res, next) {
        try {
            const userId = req.user.id;
            const referralInfo = await prisma.businessProfile.findUnique({
                where: { userId },
                select: {
                    referralCount: true,
                    referralAchievements: true,
                    referralStats: true,
                    referralCampaign: {
                        where: {
                            status: 'ACTIVE'
                        }
                    },
                    reward: true,
                    referralCodes: {
                        where: {
                            isActive: true
                        }
                    },
                    profit: true,
                    league: true
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: referralInfo
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's complaints and reports
    async getComplaintsAndReports(req, res, next) {
        try {
            const userId = req.user.id;
            const reports = await prisma.businessProfile.findUnique({
                where: { userId },
                select: {
                    reportsFiled: {
                        orderBy: { createdAt: 'desc' }
                    },
                    reportedBy: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            const complaints = await prisma.projectProfile.findUnique({
                where: { userId },
                select: {
                    complaintsFiled: {
                        orderBy: { createdAt: 'desc' }
                    },
                    complaintsReceived: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            return res.status(200).json({
                status: 200,
                success: true,
                data: {
                    reports,
                    complaints
                }
            });
        } catch (error) {
            next(error);
        }
    }
        
    async userProfile(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async showUserResume(req, res, next){
        try {
        //اگر صاحب گاراژه پروژه های گاراژ اگر مکانیک فریلنسه پروژه هایی که به اسمشه
        } catch (error) {
            next(error)
        }
    }

    async showUserBookmarks(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async showUserPosts(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowUserComments(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowUserDastyarCoWorks(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowUsersGarageProfile(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }


    async ShowGarageComments(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowGarageProjects(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowGarageDastyarReqs(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowGarageOutsourcingReqs(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

    async ShowUsersSupplierStoreProfile(req, res, next){
        try {
        
        } catch (error) {
            next(error)
        }
    }

}

module.exports = {
    UserProfileController: new UserProfileController()
}