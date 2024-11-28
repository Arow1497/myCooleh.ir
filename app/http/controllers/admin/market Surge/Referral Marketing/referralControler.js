const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Controller = require('../../../controller');
const { StatusCodes } = require('http-status-codes');

class ReferralController extends Controller {
    
  // Generate unique referral code for user
  async generateReferralCode(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: { referralCode: true }
      });

      if (!user) {
        throw createHttpError.NotFound('User not found');
      }

      // If user already has a referral code, return it
      if (user.referralCode) {
        return res.status(StatusCodes.OK).json({
          statusCode: StatusCodes.OK,
          data: user.referralCode
        });
      }

      // Generate unique referral code
      const code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}${userId}`;

      const referralCode = await prisma.referralCode.create({
        data: {
          code,
          userId: parseInt(userId)
        }
      });

      return res.status(StatusCodes.CREATED).json({
        statusCode: StatusCodes.CREATED,
        data: referralCode
      });
    } catch (error) {
      next(error);
    }
  }

  // Apply referral code during registration
  async applyReferralCode(req, res, next) {
    try {
      const { referralCode, newUserId } = req.body;

      const referral = await prisma.referralCode.findUnique({
        where: { code: referralCode },
        include: { user: true }
      });

      if (!referral) {
        throw createHttpError.NotFound('Invalid referral code');
      }

      if (referral.user.id === parseInt(newUserId)) {
        throw createHttpError.BadRequest('Cannot use own referral code');
      }

      // Check if user has already been referred
      const existingReferral = await prisma.referral.findFirst({
        where: {
          referredId: parseInt(newUserId)
        }
      });

      if (existingReferral) {
        throw createHttpError.Conflict('User has already been referred');
      }

      // Create referral record
      await prisma.referral.create({
        data: {
          referrerId: referral.userId,
          referredId: parseInt(newUserId),
          status: 'COMPLETED'
        }
      });

      // Check for milestone achievements
      await this.checkReferralMilestones(referral.userId);

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        message: 'Referral code applied successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Check and award referral milestones
  async checkReferralMilestones(userId) {
    try {
      const referralCount = await prisma.referral.count({
        where: {
          referrerId: userId,
          status: 'COMPLETED'
        }
      });

      const milestones = [
        { count: 3, rewardMonths: 1 },
        { count: 5, rewardMonths: 1 },
        { count: 10, rewardMonths: 1 }
      ];

      for (const milestone of milestones) {
        if (referralCount >= milestone.count) {
          // Check if milestone already achieved
          const existingAchievement = await prisma.referralAchievement.findFirst({
            where: {
              userId,
              referralCount: milestone.count
            }
          });

          if (!existingAchievement) {
            // Create achievement record
            await prisma.referralAchievement.create({
              data: {
                userId,
                referralCount: milestone.count,
                rewardMonths: milestone.rewardMonths,
                achievedAt: new Date(),
                status: 'PENDING'
              }
            });

            // Get user's active subscription
            const activeSubscription = await prisma.subscription.findFirst({
              where: {
                userId,
                status: 'ACTIVE'
              }
            });

            if (activeSubscription) {
              // Extend subscription
              const newEndDate = new Date(activeSubscription.endDate);
              newEndDate.setMonth(newEndDate.getMonth() + milestone.rewardMonths);

              await prisma.subscription.update({
                where: { id: activeSubscription.id },
                data: {
                  endDate: newEndDate
                }
              });

              // Update achievement status
              await prisma.referralAchievement.update({
                where: {
                  userId_referralCount: {
                    userId,
                    referralCount: milestone.count
                  }
                },
                data: {
                  status: 'CLAIMED',
                  claimedAt: new Date()
                }
              });
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Get user's referral statistics
  async getReferralStats(req, res, next) {
    try {
      const { userId } = req.params;

      const stats = await prisma.$transaction(async (prisma) => {
        const referralCount = await prisma.referral.count({
          where: {
            referrerId: parseInt(userId),
            status: 'COMPLETED'
          }
        });

        const achievements = await prisma.referralAchievement.findMany({
          where: {
            userId: parseInt(userId)
          }
        });

        const referrals = await prisma.referral.findMany({
          where: {
            referrerId: parseInt(userId)
          },
          include: {
            referred: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            }
          }
        });

        const totalRewardMonths = achievements.reduce((sum, achievement) => {
          return sum + (achievement.status === 'CLAIMED' ? achievement.rewardMonths : 0);
        }, 0);

        const nextMilestone = referralCount < 3 ? 3 : 
                            referralCount < 5 ? 5 :
                            referralCount < 10 ? 10 : null;
        
        const remainingReferrals = nextMilestone ? nextMilestone - referralCount : 0;

        return {
          referralCount,
          achievements,
          referrals,
          totalRewardMonths,
          nextMilestone,
          remainingReferrals
        };
      });

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get available rewards
  async getAvailableRewards(req, res, next) {
    try {
      const { userId } = req.params;

      const rewards = await prisma.referralAchievement.findMany({
        where: {
          userId: parseInt(userId),
          status: 'PENDING'
        }
      });

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        data: rewards
      });
    } catch (error) {
      next(error);
    }
  }

  // Get referral leaderboard
  async getLeaderboard(req, res, next) {
    try {
      const { timeframe = 'ALL_TIME' } = req.query;
      
      let dateFilter = {};
      const now = new Date();
      
      switch (timeframe) {
        case 'WEEKLY':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          dateFilter = { gte: weekAgo };
          break;
        case 'MONTHLY':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          dateFilter = { gte: monthAgo };
          break;
        case 'YEARLY':
          const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
          dateFilter = { gte: yearAgo };
          break;
      }

      const leaderboard = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              referralsGiven: {
                where: {
                  status: 'COMPLETED',
                  createdAt: dateFilter
                }
              }
            }
          },
          referralAchievements: {
            where: {
              status: 'CLAIMED'
            }
          }
        },
        orderBy: {
          referralsGiven: {
            _count: 'desc'
          }
        },
        take: 10
      });

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        data: leaderboard.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          referralCount: user._count.referralsGiven,
          achievementsCount: user.referralAchievements.length
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  // Validate referral code
  async validateReferralCode(req, res, next) {
    try {
      const { code } = req.params;

      const referralCode = await prisma.referralCode.findUnique({
        where: { code },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!referralCode) {
        throw createHttpError.NotFound('Invalid referral code');
      }

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        data: {
          isValid: true,
          referrer: referralCode.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get referred users list
  async getReferredUsers(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;

      const whereClause = {
        referrerId: parseInt(userId),
        ...(status && { status })
      };

      const [referredUsers, total] = await prisma.$transaction([
        prisma.referral.findMany({
          where: whereClause,
          include: {
            referred: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: parseInt(limit)
        }),
        prisma.referral.count({
          where: whereClause
        })
      ]);

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        data: {
          referredUsers,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get progress to next milestone
  async getMilestoneProgress(req, res, next) {
    try {
      const { userId } = req.params;

      const referralCount = await prisma.referral.count({
        where: {
          referrerId: parseInt(userId),
          status: 'COMPLETED'
        }
      });

      const milestones = [
        { count: 3, rewardMonths: 1 },
        { count: 5, rewardMonths: 1 },
        { count: 10, rewardMonths: 1 }
      ];

      let currentMilestone = null;
      let nextMilestone = null;
      let progress = 0;

      if (referralCount < 3) {
        nextMilestone = milestones[0];
        progress = (referralCount / 3) * 100;
      } else if (referralCount < 5) {
        currentMilestone = milestones[0];
        nextMilestone = milestones[1];
        progress = ((referralCount - 3) / 2) * 100;
      } else if (referralCount < 10) {
        currentMilestone = milestones[1];
        nextMilestone = milestones[2];
        progress = ((referralCount - 5) / 5) * 100;
      } else {
        currentMilestone = milestones[2];
        progress = 100;
      }

      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        data: {
          referralCount,
          currentMilestone,
          nextMilestone,
          progress: Math.round(progress),
          remainingReferrals: nextMilestone ? nextMilestone.count - referralCount : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  ReferralController: new ReferralController()
};



// I've created a comprehensive referral system that integrates with your
//  existing subscription system. Here's what I've added:

// Schema Updates:

// Added ReferralCode, Referral, and ReferralAchievement models
// Updated User model with referral relationships
// ReferralController Features:

// Generate unique referral codes for users
// Apply referral codes during registration
// Track and verify referrals
// Automatic milestone checking (3, 5, and 10 referrals)
// Reward distribution (1 month free for each milestone)
// Referral statistics and achievement tracking
// Key Features:

// Prevents self-referrals
// Tracks milestone achievements
// Automatically extends subscription periods
// Provides detailed referral statistics
// Handles pending and claimed rewards
// To use this system:

// Generate referral code for users
// Users share their referral codes
// New users register with referral codes
// System automatically tracks referrals and awards milestones
// Free months are automatically added to active subscriptions
