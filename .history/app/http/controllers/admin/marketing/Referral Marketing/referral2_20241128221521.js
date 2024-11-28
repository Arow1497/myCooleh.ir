const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Controller = require('../../../controller');
const { StatusCodes } = require('http-status-codes');

class ReferralController extends Controller {

    // Generate Referral Code for a User
    async generateReferralCode(req, res, next) {
        try {
            const { userId } = req.body; // Assuming userId is passed in the request body

            // Check if the user exists
            const user = await prisma.businessProfile.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw createHttpError.NotFound("User not found.");
            }

            // Generate a unique referral code
            const code = generateUniqueCode(); // Implement your unique code generation logic

            // Create a new ReferralCode entry
            const referralCode = await prisma.referralCode.create({
                data: {
                    code,
                    userId,
                },
            });

            return res.status(StatusCodes.CREATED).json({
                status: StatusCodes.CREATED,
                data: {
                    referralCode,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Use a Referral Code
    async useReferralCode(req, res, next) {
        try {
            const { referralCode, referredUserId } = req.body; // Assuming both are passed in the request body

            // Check if the referral code exists and is active
            const code = await prisma.referralCode.findUnique({
                where: { code: referralCode },
                include: { referrals: true }
            });

            if (!code || !code.isActive) {
                throw createHttpError.NotFound("Invalid or expired referral code.");
            }

            // Check if referred user exists
            const referredUser = await prisma.businessProfile.findUnique({
                where: { id: referredUserId }
            });

            if (!referredUser) {
                throw createHttpError.NotFound("Referred user not found.");
            }

            // Check if the referral code has already been used by this user
            const existingReferralUse = code.referrals.find(referral => referral.referredUserId === referredUserId);
            if (existingReferralUse) {
                throw createHttpError.Conflict("This user has already used this referral code.");
            }

            // Check if maxUses limit is reached
            if (code.maxUses && code.usedCount >= parseInt(code.maxUses)) {
                throw createHttpError.Conflict("Referral code has reached maximum uses.");
            }

            // Create a ReferralUse record
            const referralUse = await prisma.referralUse.create({
                data: {
                    referralCodeId: code.id,
                    referredUserId,
                    status: 'COMPLETED', // Assuming immediate completion, adjust as needed
                }
            });

            // Update usedCount on ReferralCode
            await prisma.referralCode.update({
                where: { id: code.id },
                data: { usedCount: code.usedCount + 1 }
            });

            // Update ReferralStats
            await updateReferralStats(code.userId); 

            // Check for Referral Milestones and apply rewards
            await checkAndApplyMilestoneRewards(code.userId); 

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                data: {
                    referralUse,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get Referral Stats for a User
    async getReferralStats(req, res, next) {
        try {
            const { userId } = req.params;

            const stats = await prisma.referralStats.findUnique({
                where: { userId },
            });

            if (!stats) {
                throw createHttpError.NotFound("Referral stats not found for this user.");
            }

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                data: {
                    stats,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Check Referral Code Validity
    async checkReferralCode(req, res, next) {
        try {
            const { referralCode } = req.params;
            const code = await prisma.referralCode.findUnique({
                where: { code: referralCode },
            });

            if (!code || !code.isActive) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    status: StatusCodes.NOT_FOUND,
                    message: "Invalid or expired referral code."
                });
            }

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                data: {
                    isValid: true
                }
            });
        } catch (error) {
            next(error);
        }
    }

}

// Helper function to generate a unique referral code (implement your logic)
function generateUniqueCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Helper function to update ReferralStats
async function updateReferralStats(userId) {
    const stats = await prisma.referralStats.findUnique({
        where: { userId },
    });

    const successfulReferrals = await prisma.referralUse.count({
        where: {
            referralCode: { userId },
            status: 'COMPLETED'
        }
    });

    if (!stats) {
        await prisma.referralStats.create({
            data: {
                userId,
                totalReferrals: 1,
                successfulReferrals
            }
        });
    } else {
        await prisma.referralStats.update({
            where: { userId },
            data: {
                totalReferrals: stats.totalReferrals + 1,
                successfulReferrals
            }
        });
    }
}

// Helper function to check and apply milestone rewards
async function checkAndApplyMilestoneRewards(userId) {
    const stats = await prisma.referralStats.findUnique({
        where: { userId },
    });

    const milestones = await prisma.referralMilestone.findMany({
        where: { isActive: true },
        orderBy: { usersRequired: 'asc' }
    });

    for (const milestone of milestones) {
        if (stats.successfulReferrals >= parseInt(milestone.usersRequired)) {
            const existingAchievement = await prisma.referralAchievement.findUnique({
                where: {
                    userId_milestoneId: {
                        userId,
                        milestoneId: milestone.id
                    }
                }
            });

            if (!existingAchievement) {
                await prisma.referralAchievement.create({
                    data: {
                        userId,
                        milestoneId: milestone.id,
                        rewardClaimed: false // User needs to claim the reward
                    }
                });
                // Potentially add logic here to notify the user about the milestone achievement
            }
        }
    }
}

module.exports = {
    ReferralController: new ReferralController()
};

//////////////////////////////////////////////////

const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const Controller = require('../../../controller');
const { StatusCodes } = require('http-status-codes');

class ReferralController extends Controller {
  // Generate unique referral code for user
  async generateReferralCode(req, res) {
    try {
      const { userId } = req.user;
      
      // Generate unique code (combination of user id and random string)
      const code = `${userId.substr(0, 6)}${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
      
      const referralCode = await prisma.referralCode.create({
        data: {
          code,
          userId,
          maxUses: "25", // Total maximum referrals per user
          isActive: true
        }
      });

      return this.success(res, {
        statusCode: StatusCodes.CREATED,
        data: referralCode
      });
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Apply referral code when new user signs up
  async applyReferralCode(req, res) {
    try {
      const { referralCode } = req.body;
      const { userId } = req.user;

      const code = await prisma.referralCode.findUnique({
        where: { code: referralCode },
        include: { user: true }
      });

      if (!code || !code.isActive) {
        throw createHttpError.BadRequest('Invalid referral code');
      }

      if (code.userId === userId) {
        throw createHttpError.BadRequest('Cannot use own referral code');
      }

      // Check if code hasn't exceeded max uses
      if (code.usedCount >= parseInt(code.maxUses)) {
        throw createHttpError.BadRequest('Referral code has reached maximum uses');
      }

      // Record referral use
      await prisma.referralUse.create({
        data: {
          referralCodeId: code.id,
          referredUserId: userId,
          status: 'COMPLETED'
        }
      });

      // Update referral code usage count
      await prisma.referralCode.update({
        where: { id: code.id },
        data: { usedCount: code.usedCount + 1 }
      });

      // Update referrer's stats
      await this.updateReferrerStats(code.userId);

      return this.success(res, {
        statusCode: StatusCodes.OK,
        message: 'Referral code applied successfully'
      });
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Get user's referral statistics
  async getReferralStats(req, res) {
    try {
      const { userId } = req.user;

      const stats = await prisma.referralStats.findUnique({
        where: { userId },
        include: {
          user: true
        }
      });

      if (!stats) {
        // Create initial stats if not exists
        const newStats = await prisma.referralStats.create({
          data: {
            userId,
            totalReferrals: 0,
            successfulReferrals: 0,
            totalEarnings: 0,
            currentTier: 'BRONZE'
          }
        });
        return this.success(res, {
          statusCode: StatusCodes.OK,
          data: newStats
        });
      }

      return this.success(res, {
        statusCode: StatusCodes.OK,
        data: stats
      });
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Check and award milestone achievements
  async checkMilestoneAchievements(userId, referralCount) {
    try {
      const milestones = await prisma.referralMilestone.findMany({
        where: { isActive: true },
        orderBy: { usersRequired: 'asc' }
      });

      for (const milestone of milestones) {
        if (referralCount >= parseInt(milestone.usersRequired)) {
          // Check if milestone already achieved
          const existing = await prisma.referralAchievement.findFirst({
            where: {
              userId,
              milestoneId: milestone.id
            }
          });

          if (!existing) {
            // Award new milestone achievement
            await prisma.referralAchievement.create({
              data: {
                userId,
                milestoneId: milestone.id,
                rewardClaimed: false
              }
            });

            // Add subscription reward
            await this.awardSubscriptionReward(userId, parseInt(milestone.rewardMonths));
          }
        }
      }
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Award subscription reward months
  async awardSubscriptionReward(userId, rewardMonths) {
    try {
      const currentSubscription = await prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' }
      });

      if (currentSubscription) {
        const newEndDate = new Date(currentSubscription.endDate);
        newEndDate.setMonth(newEndDate.getMonth() + rewardMonths);

        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            endDate: newEndDate,
            totalRewardMonths: {
              increment: rewardMonths
            }
          }
        });
      }
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Update referrer statistics
  async updateReferrerStats(userId) {
    try {
      const referralUses = await prisma.referralCode.findMany({
        where: { userId },
        include: {
          referrals: true
        }
      });

      const totalReferrals = referralUses.reduce((acc, code) => 
        acc + code.referrals.length, 0
      );

      const successfulReferrals = referralUses.reduce((acc, code) => 
        acc + code.referrals.filter(r => r.status === 'COMPLETED').length, 0
      );

      await prisma.referralStats.upsert({
        where: { userId },
        update: {
          totalReferrals,
          successfulReferrals
        },
        create: {
          userId,
          totalReferrals,
          successfulReferrals
        }
      });

      // Check for milestone achievements
      await this.checkMilestoneAchievements(userId, successfulReferrals);
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Get user's referral history
  async getReferralHistory(req, res) {
    try {
      const { userId } = req.user;

      const referralHistory = await prisma.referralCode.findMany({
        where: { userId },
        include: {
          referrals: {
            include: {
              referredUser: true
            }
          }
        }
      });

      return this.success(res, {
        statusCode: StatusCodes.OK,
        data: referralHistory
      });
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }

  // Get user's milestone achievements
  async getMilestoneAchievements(req, res) {
    try {
      const { userId } = req.user;

      const achievements = await prisma.referralAchievement.findMany({
        where: { userId },
        include: {
          milestone: true
        }
      });

      return this.success(res, {
        statusCode: StatusCodes.OK,
        data: achievements
      });
    } catch (error) {
      throw createHttpError.InternalServerError(error.message);
    }
  }
}

module.exports = {
  ReferralController: new ReferralController()
};

/////////////////////////////////////////////////////////////////
//CLAUDE//CLAUDE//CLAUDE

const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const Controller = require('../../../controller');
const { StatusCodes } = require('http-status-codes');

class ReferralController extends Controller {
    // Create a new referral campaign
    async createReferralCampaign(req, res) {
        try {
            const { name, description, rewardType, rewardAmount, startDate, endDate, requirements, termsAndConditions } = req.body;
            const userId = req.user.id;

            const campaign = await prisma.referralCampaign.create({
                data: {
                    name,
                    description,
                    creatorId: userId,
                    rewardType,
                    rewardAmount,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : null,
                    requirements,
                    termsAndConditions
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.CREATED,
                message: "Referral campaign created successfully",
                data: campaign
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Track referral milestone achievement
    async trackReferralMilestone(req, res) {
        try {
            const userId = req.user.id;
            const referralStats = await prisma.referralStats.findUnique({
                where: { userId }
            });

            if (!referralStats) {
                throw createHttpError(StatusCodes.NOT_FOUND, "Referral stats not found");
            }

            // Get all milestones
            const milestones = await prisma.referralMilestone.findMany({
                where: { isActive: true },
                orderBy: { usersRequired: 'asc' }
            });

            // Check for new achievements
            for (const milestone of milestones) {
                const alreadyAchieved = await prisma.referralAchievement.findFirst({
                    where: {
                        userId,
                        milestoneId: milestone.id
                    }
                });

                if (!alreadyAchieved && referralStats.successfulReferrals >= parseInt(milestone.usersRequired)) {
                    // Create achievement record
                    await prisma.referralAchievement.create({
                        data: {
                            userId,
                            milestoneId: milestone.id
                        }
                    });

                    // Update user's subscription with reward
                    const activeSubscription = await prisma.subscription.findFirst({
                        where: {
                            userId,
                            status: 'ACTIVE'
                        }
                    });

                    if (activeSubscription) {
                        const rewardMonths = parseInt(milestone.rewardMonths);
                        const newEndDate = new Date(activeSubscription.endDate);
                        newEndDate.setMonth(newEndDate.getMonth() + rewardMonths);

                        await prisma.subscription.update({
                            where: { id: activeSubscription.id },
                            data: {
                                endDate: newEndDate,
                                totalRewardMonths: {
                                    increment: rewardMonths
                                }
                            }
                        });
                    }
                }
            }

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: "Referral milestones tracked successfully"
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Apply referral reward to subscription
    async applyReferralReward(req, res) {
        try {
            const { achievementId } = req.body;
            const userId = req.user.id;

            const achievement = await prisma.referralAchievement.findFirst({
                where: {
                    id: achievementId,
                    userId,
                    rewardClaimed: false
                },
                include: {
                    milestone: true
                }
            });

            if (!achievement) {
                throw createHttpError(StatusCodes.NOT_FOUND, "Achievement not found or already claimed");
            }

            // Find active subscription
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE'
                }
            });

            if (!subscription) {
                throw createHttpError(StatusCodes.BAD_REQUEST, "No active subscription found");
            }

            // Calculate new end date
            const rewardMonths = parseInt(achievement.milestone.rewardMonths);
            const newEndDate = new Date(subscription.endDate);
            newEndDate.setMonth(newEndDate.getMonth() + rewardMonths);

            // Update subscription and mark achievement as claimed
            const [updatedSubscription, updatedAchievement] = await prisma.$transaction([
                prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        endDate: newEndDate,
                        totalRewardMonths: {
                            increment: rewardMonths
                        }
                    }
                }),
                prisma.referralAchievement.update({
                    where: { id: achievementId },
                    data: {
                        rewardClaimed: true,
                        subscriptionId: subscription.id
                    }
                })
            ]);

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: "Referral reward applied successfully",
                data: {
                    subscription: updatedSubscription,
                    achievement: updatedAchievement
                }
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Get user's current referral tier and progress
    async getReferralTierStatus(req, res) {
        try {
            const userId = req.user.id;

            const referralStats = await prisma.referralStats.findUnique({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            mobile: true
                        }
                    }
                }
            });

            if (!referralStats) {
                throw createHttpError(StatusCodes.NOT_FOUND, "Referral stats not found");
            }

            // Get next tier requirements
            const nextTier = await this.getNextTier(referralStats.currentTier);
            
            // Get all achievements
            const achievements = await prisma.referralAchievement.findMany({
                where: { userId },
                include: {
                    milestone: true
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: {
                    currentTier: referralStats.currentTier,
                    totalReferrals: referralStats.totalReferrals,
                    successfulReferrals: referralStats.successfulReferrals,
                    totalEarnings: referralStats.totalEarnings,
                    nextTier: nextTier,
                    achievements: achievements,
                }
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Helper method to get next tier
    async getNextTier(currentTier) {
        const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
        const currentIndex = tiers.indexOf(currentTier);
        
        if (currentIndex < tiers.length - 1) {
            return tiers[currentIndex + 1];
        }
        return null;
    }

    // Get available rewards for user
    async getAvailableRewards(req, res) {
        try {
            const userId = req.user.id;

            const unclaimedRewards = await prisma.referralAchievement.findMany({
                where: {
                    userId,
                    rewardClaimed: false
                },
                include: {
                    milestone: true
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: unclaimedRewards
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }
    // مدیریت کمپین‌های رفرال فعال
    async getActiveCampaigns(req, res) {
        try {
            const campaigns = await prisma.referralCampaign.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { endDate: null },
                        { endDate: { gt: new Date() } }
                    ]
                },
                include: {
                    rewards: true,
                    creator: {
                        select: {
                            id: true,
                            mobile: true
                        }
                    }
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: campaigns
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // آنالیز عملکرد رفرال برای یک بازه زمانی
    async getReferralAnalytics(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const userId = req.user.id;

            const referralUses = await prisma.referralUse.findMany({
                where: {
                    referralCode: {
                        userId: userId
                    },
                    usedAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                },
                include: {
                    referredUser: true
                }
            });

            const analytics = {
                totalReferrals: referralUses.length,
                successfulReferrals: referralUses.filter(use => use.status === 'COMPLETED').length,
                pendingReferrals: referralUses.filter(use => use.status === 'PENDING').length,
                conversionRate: (referralUses.filter(use => use.status === 'COMPLETED').length / referralUses.length) * 100,
                referralsByDay: this._groupReferralsByDay(referralUses)
            };

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: analytics
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // دریافت لیست کاربران رفرال شده
    async getReferredUsers(req, res) {
        try {
            const userId = req.user.id;
            const { status, page = 1, limit = 10 } = req.query;

            const where = {
                referralCode: {
                    userId: userId
                }
            };

            if (status) {
                where.status = status;
            }

            const referredUsers = await prisma.referralUse.findMany({
                where,
                include: {
                    referredUser: {
                        select: {
                            id: true,
                            mobile: true,
                            createdAt: true
                        }
                    }
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    usedAt: 'desc'
                }
            });

            const total = await prisma.referralUse.count({ where });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: {
                    users: referredUsers,
                    pagination: {
                        total,
                        page: parseInt(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // مدیریت اعلان‌های پاداش رفرال
    async claimPendingRewards(req, res) {
        try {
            const userId = req.user.id;

            const pendingAchievements = await prisma.referralAchievement.findMany({
                where: {
                    userId,
                    rewardClaimed: false
                },
                include: {
                    milestone: true
                }
            });

            if (!pendingAchievements.length) {
                return this.success(res, {
                    statusCode: StatusCodes.OK,
                    message: "No pending rewards found",
                    data: []
                });
            }

            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE'
                }
            });

            if (!subscription) {
                throw createHttpError(StatusCodes.BAD_REQUEST, "No active subscription found");
            }

            // Calculate total reward months
            const totalRewardMonths = pendingAchievements.reduce(
                (total, achievement) => total + parseInt(achievement.milestone.rewardMonths), 0
            );

            // Update subscription end date
            const newEndDate = new Date(subscription.endDate);
            newEndDate.setMonth(newEndDate.getMonth() + totalRewardMonths);

            // Process all achievements in a transaction
            const result = await prisma.$transaction(async (prisma) => {
                // Update subscription
                const updatedSubscription = await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        endDate: newEndDate,
                        totalRewardMonths: {
                            increment: totalRewardMonths
                        }
                    }
                });

                // Mark all achievements as claimed
                const updatedAchievements = await Promise.all(
                    pendingAchievements.map(achievement =>
                        prisma.referralAchievement.update({
                            where: { id: achievement.id },
                            data: {
                                rewardClaimed: true,
                                subscriptionId: subscription.id
                            }
                        })
                    )
                );

                return { subscription: updatedSubscription, achievements: updatedAchievements };
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: `Successfully claimed ${pendingAchievements.length} rewards for ${totalRewardMonths} months`,
                data: result
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // بروزرسانی خودکار سطح رفرال کاربر
    async updateReferralTier(req, res) {
        try {
            const userId = req.user.id;

            const referralStats = await prisma.referralStats.findUnique({
                where: { userId }
            });

            if (!referralStats) {
                throw createHttpError(StatusCodes.NOT_FOUND, "Referral stats not found");
            }

            // تعیین سطح جدید بر اساس تعداد رفرال‌های موفق
            let newTier = 'BRONZE';
            if (referralStats.successfulReferrals >= 25) {
                newTier = 'DIAMOND';
            } else if (referralStats.successfulReferrals >= 15) {
                newTier = 'PLATINUM';
            } else if (referralStats.successfulReferrals >= 10) {
                newTier = 'GOLD';
            } else if (referralStats.successfulReferrals >= 5) {
                newTier = 'SILVER';
            }

            if (newTier !== referralStats.currentTier) {
                const updatedStats = await prisma.referralStats.update({
                    where: { userId },
                    data: { currentTier: newTier }
                });

                // ایجاد نوتیفیکیشن برای ارتقای سطح
                if (updatedStats.currentTier !== 'BRONZE') {
                    await prisma.notification.create({
                        data: {
                            userId,
                            title: 'Referral Tier Upgrade',
                            message: `Congratulations! Your referral tier has been upgraded to ${newTier}`,
                            type: 'REFERRAL_TIER_UPGRADE'
                        }
                    });
                }

                return this.success(res, {
                    statusCode: StatusCodes.OK,
                    message: "Referral tier updated successfully",
                    data: updatedStats
                });
            }

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: "No tier update needed",
                data: referralStats
            });
        } catch (error) {
            throw createHttpError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Helper method for grouping referrals by day
    _groupReferralsByDay(referrals) {
        const grouped = {};
        referrals.forEach(referral => {
            const date = referral.usedAt.toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = 0;
            }
            grouped[date]++;
        });
        return grouped;
    }
}


module.exports = {
    ReferralController: new ReferralController()
};

/*
این کنترلر شامل هندلرهای جدید و مهم زیر است:

createReferralCampaign: برای ایجاد کمپین‌های رفرال جدید
trackReferralMilestone: برای پیگیری و بررسی دستیابی به اهداف رفرال و اعطای پاداش‌ها
applyReferralReward: برای اعمال پاداش‌های رفرال به اشتراک کاربر
getReferralTierStatus: برای دریافت وضعیت فعلی سطح رفرال کاربر و پیشرفت
getAvailableRewards: برای دریافت لیست پاداش‌های قابل دریافت


هندلرهای جدید اضافه شده شامل:

getActiveCampaigns: دریافت لیست کمپین‌های رفرال فعال

نمایش کمپین‌های در حال اجرا
شامل جزئیات پاداش‌ها و ایجادکننده کمپین


getReferralAnalytics: آنالیز عملکرد رفرال

آمار کلی رفرال‌ها در بازه زمانی مشخص
نرخ تبدیل و موفقیت
گروه‌بندی رفرال‌ها بر اساس روز


getReferredUsers: مدیریت کاربران رفرال شده

لیست کاربران دعوت شده با فیلتر وضعیت
صفحه‌بندی نتایج
مرتب‌سازی بر اساس تاریخ


claimPendingRewards: مدیریت یکپارچه پاداش‌ها

دریافت همه پاداش‌های معوق در یک تراکنش
بروزرسانی خودکار تاریخ پایان اشتراک
ثبت همه پاداش‌ها به صورت یکجا


updateReferralTier: بروزرسانی خودکار سطح رفرال

محاسبه سطح جدید بر اساس تعداد رفرال‌های موفق
ایجاد نوتیفیکیشن برای ارتقای سطح
بروزرسانی آمار کاربر



این هندلرها مکمل هندلرهای قبلی هستند و به شما امکان می‌دهند:

کمپین‌های رفرال را مدیریت کنید
آمار و تحلیل‌های دقیق داشته باشید
پاداش‌ها را به صورت یکپارچه مدیریت کنید
سطوح رفرال را به صورت خودکار بروز کنید
کاربران رفرال شده را پیگیری کنید

*/