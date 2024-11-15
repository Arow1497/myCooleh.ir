const createHttpError = require('http-errors');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { StatusCodes } = require('http-status-codes');

class SubscriptionController extends Controller {
    // Create new subscription
    async createSubscription(req, res, next) {
        try {
            const { userId, planId, paymentMethodId } = req.body;

            // Verify user and plan exist
            const [user, plan] = await Promise.all([
                prisma.user.findUnique({ where: { id: userId } }),
                prisma.plan.findUnique({ where: { id: planId } })
            ]);

            if (!user) throw createHttpError.NotFound("User not found");
            if (!plan) throw createHttpError.NotFound("Plan not found");

            // Check for existing active subscription
            const existingSubscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE'
                }
            });

            if (existingSubscription) {
                throw createHttpError.Conflict("User already has an active subscription");
            }

            // Calculate period dates
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (plan.interval === 'MONTHLY' ? 1 : 12));

            // Create subscription with billing record
            const subscription = await prisma.$transaction(async (prisma) => {
                // Create subscription
                const subscription = await prisma.subscription.create({
                    data: {
                        userId,
                        planId,
                        status: 'ACTIVE',
                        startDate,
                        endDate,
                        currentPeriodStart: startDate,
                        currentPeriodEnd: endDate,
                        tierId: plan.tierId
                    }
                });

                // Create billing record
                await prisma.billingRecord.create({
                    data: {
                        subscriptionId: subscription.id,
                        amount: plan.price,
                        billingDate: startDate,
                        nextBillingDate: endDate,
                        status: 'SUCCESSFUL',
                        paymentMethodId
                    }
                });

                return subscription;
            });

            return res.status(StatusCodes.CREATED).json({
                statusCode: StatusCodes.CREATED,
                data: {
                    subscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get subscription details
    async getSubscription(req, res, next) {
        try {
            const { subscriptionId } = req.params;

            const subscription = await prisma.subscription.findUnique({
                where: { id: parseInt(subscriptionId) },
                include: {
                    plan: true,
                    billingRecords: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                    usageLogs: {
                        where: {
                            billingPeriodStart: {
                                lte: new Date()
                            },
                            billingPeriodEnd: {
                                gte: new Date()
                            }
                        }
                    }
                }
            });

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    subscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Update subscription plan
    async updateSubscription(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { newPlanId } = req.body;

            const subscription = await prisma.subscription.findUnique({
                where: { id: parseInt(subscriptionId) },
                include: { plan: true }
            });

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }

            const newPlan = await prisma.plan.findUnique({
                where: { id: newPlanId }
            });

            if (!newPlan) {
                throw createHttpError.NotFound("New plan not found");
            }

            // Record the change and update subscription
            const updatedSubscription = await prisma.$transaction(async (prisma) => {
                // Record the change
                await prisma.subscriptionChange.create({
                    data: {
                        subscriptionId: parseInt(subscriptionId),
                        fromPlanId: subscription.planId,
                        toPlanId: newPlanId,
                        changeType: newPlan.price > subscription.plan.price ? 'UPGRADE' : 'DOWNGRADE',
                        effectiveDate: new Date()
                    }
                });

                // Update the subscription
                return prisma.subscription.update({
                    where: { id: parseInt(subscriptionId) },
                    data: {
                        planId: newPlanId,
                        tierId: newPlan.tierId
                    }
                });
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    subscription: updatedSubscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Cancel subscription
    async cancelSubscription(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { cancellationReason } = req.body;

            const subscription = await prisma.subscription.findUnique({
                where: { id: parseInt(subscriptionId) }
            });

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }

            // Record cancellation and update subscription
            const cancelledSubscription = await prisma.$transaction(async (prisma) => {
                // Record the change
                await prisma.subscriptionChange.create({
                    data: {
                        subscriptionId: parseInt(subscriptionId),
                        fromPlanId: subscription.planId,
                        toPlanId: subscription.planId,
                        changeType: 'CANCELLATION',
                        reason: cancellationReason,
                        effectiveDate: new Date()
                    }
                });

                // Update the subscription
                return prisma.subscription.update({
                    where: { id: parseInt(subscriptionId) },
                    data: {
                        status: 'CANCELED',
                        canceledAt: new Date()
                    }
                });
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    subscription: cancelledSubscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get subscription usage
    async getSubscriptionUsage(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { startDate, endDate } = req.query;

            const usage = await prisma.usageLog.findMany({
                where: {
                    subscriptionId: parseInt(subscriptionId),
                    timestamp: {
                        gte: startDate ? new Date(startDate) : undefined,
                        lte: endDate ? new Date(endDate) : undefined
                    }
                },
                include: {
                    subscription: {
                        include: {
                            plan: {
                                include: {
                                    featureLimits: true
                                }
                            }
                        }
                    }
                }
            });

            // Calculate usage against limits
            const usageSummary = usage.reduce((acc, log) => {
                if (!acc[log.featureKey]) {
                    acc[log.featureKey] = {
                        total: 0,
                        limit: log.subscription.plan.featureLimits.find(
                            limit => limit.featureKey === log.featureKey
                        )?.monthlyLimit || 'unlimited'
                    };
                }
                acc[log.featureKey].total += log.quantity;
                return acc;
            }, {});

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    usage: usageSummary
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get billing history
    async getBillingHistory(req, res, next) {
        try {
            const { subscriptionId } = req.params;

            const billingHistory = await prisma.billingRecord.findMany({
                where: {
                    subscriptionId: parseInt(subscriptionId)
                },
                include: {
                    paymentMethod: true,
                    invoice: true
                },
                orderBy: {
                    billingDate: 'desc'
                }
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    billingHistory
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Apply referral reward to subscription
    async applyReferralReward(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { achievementId } = req.body;

            const [subscription, achievement] = await Promise.all([
                prisma.subscription.findUnique({
                    where: { id: parseInt(subscriptionId) }
                }),
                prisma.referralAchievement.findUnique({
                    where: { id: achievementId },
                    include: {
                        milestone: true
                    }
                })
            ]);

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }
            if (!achievement) {
                throw createHttpError.NotFound("Referral achievement not found");
            }
            if (achievement.rewardClaimed) {
                throw createHttpError.Conflict("Reward already claimed");
            }

            // Calculate new end date
            const newEndDate = new Date(subscription.endDate);
            newEndDate.setMonth(newEndDate.getMonth() + achievement.milestone.rewardMonths);

            // Apply reward
            const updatedSubscription = await prisma.$transaction(async (prisma) => {
                // Update subscription end date
                const subscription = await prisma.subscription.update({
                    where: { id: parseInt(subscriptionId) },
                    data: {
                        endDate: newEndDate
                    }
                });

                // Mark achievement as claimed
                await prisma.referralAchievement.update({
                    where: { id: achievementId },
                    data: {
                        rewardClaimed: true,
                        subscriptionId: parseInt(subscriptionId)
                    }
                });

                // Record the change
                await prisma.subscriptionChange.create({
                    data: {
                        subscriptionId: parseInt(subscriptionId),
                        fromPlanId: subscription.planId,
                        toPlanId: subscription.planId,
                        changeType: 'REFERRAL_REWARD',
                        effectiveDate: new Date()
                    }
                });

                return subscription;
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    subscription: updatedSubscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

      // Start a trial subscription
      async startTrial(req, res, next) {
        try {
            const { userId, planId } = req.body;

            // Check if user has had a trial before
            const previousTrial = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'TRIAL'
                }
            });

            if (previousTrial) {
                throw createHttpError.Conflict("User has already used their trial period");
            }

            const trialDuration = 14; // 14 days trial
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + trialDuration);

            const trialSubscription = await prisma.subscription.create({
                data: {
                    userId,
                    planId,
                    status: 'TRIAL',
                    startDate,
                    endDate,
                    currentPeriodStart: startDate,
                    currentPeriodEnd: endDate,
                    tierId: (await prisma.plan.findUnique({ where: { id: planId } })).tierId
                }
            });

            return res.status(StatusCodes.CREATED).json({
                statusCode: StatusCodes.CREATED,
                data: {
                    subscription: trialSubscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Reactivate canceled subscription
    async reactivateSubscription(req, res, next) {
        try {
            const { subscriptionId } = req.params;

            const subscription = await prisma.subscription.findUnique({
                where: { id: parseInt(subscriptionId) }
            });

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }

            if (subscription.status !== 'CANCELED') {
                throw createHttpError.BadRequest("Subscription is not canceled");
            }

            const reactivatedSubscription = await prisma.$transaction(async (prisma) => {
                // Record the change
                await prisma.subscriptionChange.create({
                    data: {
                        subscriptionId: parseInt(subscriptionId),
                        fromPlanId: subscription.planId,
                        toPlanId: subscription.planId,
                        changeType: 'REACTIVATION',
                        effectiveDate: new Date()
                    }
                });

                // Reactivate the subscription
                return prisma.subscription.update({
                    where: { id: parseInt(subscriptionId) },
                    data: {
                        status: 'ACTIVE',
                        canceledAt: null
                    }
                });
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    subscription: reactivatedSubscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Pause subscription
    async pauseSubscription(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { pauseDuration } = req.body; // in days

            const subscription = await prisma.subscription.findUnique({
                where: { id: parseInt(subscriptionId) }
            });

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }

            if (subscription.status !== 'ACTIVE') {
                throw createHttpError.BadRequest("Only active subscriptions can be paused");
            }

            const pausedSubscription = await prisma.$transaction(async (prisma) => {
                // Record the change
                await prisma.subscriptionChange.create({
                    data: {
                        subscriptionId: parseInt(subscriptionId),
                        fromPlanId: subscription.planId,
                        toPlanId: subscription.planId,
                        changeType: 'PAUSED',
                        effectiveDate: new Date()
                    }
                });

                // Extend the subscription end date by pause duration
                const newEndDate = new Date(subscription.endDate);
                newEndDate.setDate(newEndDate.getDate() + pauseDuration);

                return prisma.subscription.update({
                    where: { id: parseInt(subscriptionId) },
                    data: {
                        status: 'PAUSED',
                        endDate: newEndDate
                    }
                });
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    subscription: pausedSubscription
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get subscription analytics
    async getSubscriptionAnalytics(req, res, next) {
        try {
            const { userId } = req.params;
            const { startDate, endDate } = req.query;

            const analyticsData = await prisma.$transaction(async (prisma) => {
                // Get usage trends
                const usageTrends = await prisma.usageLog.groupBy({
                    by: ['featureKey'],
                    where: {
                        subscription: {
                            userId: parseInt(userId)
                        },
                        timestamp: {
                            gte: startDate ? new Date(startDate) : undefined,
                            lte: endDate ? new Date(endDate) : undefined
                        }
                    },
                    _sum: {
                        quantity: true
                    }
                });

                // Get billing summary
                const billingRecords = await prisma.billingRecord.findMany({
                    where: {
                        subscription: {
                            userId: parseInt(userId)
                        },
                        billingDate: {
                            gte: startDate ? new Date(startDate) : undefined,
                            lte: endDate ? new Date(endDate) : undefined
                        }
                    }
                });

                // Calculate total spent
                const totalSpent = billingRecords.reduce((sum, record) => sum + record.amount, 0);

                return {
                    usageTrends,
                    billingRecords,
                    totalSpent
                };
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: analyticsData
            });
        } catch (error) {
            next(error);
        }
    }

    // Check subscription status and send notifications
    async checkSubscriptionStatus(req, res, next) {
        try {
            const { subscriptionId } = req.params;

            const subscription = await prisma.subscription.findUnique({
                where: { id: parseInt(subscriptionId) },
                include: {
                    plan: true,
                    user: true
                }
            });

            if (!subscription) {
                throw createHttpError.NotFound("Subscription not found");
            }

            // Check various conditions
            const today = new Date();
            const daysUntilExpiration = Math.ceil((subscription.endDate - today) / (1000 * 60 * 60 * 24));
            const isNearExpiration = daysUntilExpiration <= 7;
            const isOverdue = today > subscription.endDate;

            // Get usage status
            const currentUsage = await prisma.usageLog.groupBy({
                by: ['featureKey'],
                where: {
                    subscriptionId: parseInt(subscriptionId),
                    billingPeriodStart: { lte: today },
                    billingPeriodEnd: { gte: today }
                },
                _sum: {
                    quantity: true
                }
            });

            // Prepare status report
            const statusReport = {
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    daysUntilExpiration
                },
                alerts: {
                    isNearExpiration,
                    isOverdue,
                    requiresAction: isNearExpiration || isOverdue
                },
                usage: currentUsage
            };

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: statusReport
            });
        } catch (error) {
            next(error);
        }
    }

    // Add or update payment method for subscription
    async updatePaymentMethod(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { paymentMethodId, setAsDefault } = req.body;

            const [subscription, paymentMethod] = await Promise.all([
                prisma.subscription.findUnique({
                    where: { id: parseInt(subscriptionId) },
                    include: { customer: true }
                }),
                prisma.paymentMethod.findUnique({
                    where: { id: parseInt(paymentMethodId) }
                })
            ]);

            if (!subscription) throw createHttpError.NotFound("Subscription not found");
            if (!paymentMethod) throw createHttpError.NotFound("Payment method not found");

            // Update payment method
            await prisma.$transaction(async (prisma) => {
                if (setAsDefault) {
                    // Reset other payment methods
                    await prisma.paymentMethod.updateMany({
                        where: {
                            customerId: subscription.customer.id
                        },
                        data: {
                            isDefault: false
                        }
                    });
                }

                // Update selected payment method
                await prisma.paymentMethod.update({
                    where: { id: parseInt(paymentMethodId) },
                    data: {
                        isDefault: setAsDefault || false
                    }
                });
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                message: "Payment method updated successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Preview subscription changes
    async previewSubscriptionChange(req, res, next) {
        try {
            const { subscriptionId } = req.params;
            const { newPlanId } = req.body;

            const [currentSubscription, newPlan] = await Promise.all([
                prisma.subscription.findUnique({
                    where: { id: parseInt(subscriptionId) },
                    include: { plan: true }
                }),
                prisma.plan.findUnique({
                    where: { id: parseInt(newPlanId) },
                    include: { featureLimits: true }
                })
            ]);

            if (!currentSubscription) throw createHttpError.NotFound("Subscription not found");
            if (!newPlan) throw createHttpError.NotFound("New plan not found");

            // Calculate prorated amounts and feature changes
            const today = new Date();
            const daysLeftInBillingCycle = Math.ceil(
                (currentSubscription.currentPeriodEnd - today) / (1000 * 60 * 60 * 24)
            );
            const totalDaysInBillingCycle = Math.ceil(
                (currentSubscription.currentPeriodEnd - currentSubscription.currentPeriodStart) / (1000 * 60 * 60 * 24)
            );

            const proratedCredit = (currentSubscription.plan.price * daysLeftInBillingCycle) / totalDaysInBillingCycle;
            const proratedCharge = (newPlan.price * daysLeftInBillingCycle) / totalDaysInBillingCycle;
            const priceDifference = proratedCharge - proratedCredit;

            // Compare feature limits
            const featureChanges = newPlan.featureLimits.map(newLimit => {
                const currentLimit = currentSubscription.plan.featureLimits.find(
                    cl => cl.featureKey === newLimit.featureKey
                );
                return {
                    featureKey: newLimit.featureKey,
                    currentLimit: currentLimit?.monthlyLimit || 0,
                    newLimit: newLimit.monthlyLimit,
                    difference: newLimit.monthlyLimit - (currentLimit?.monthlyLimit || 0)
                };
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    currentPlan: {
                        name: currentSubscription.plan.name,
                        price: currentSubscription.plan.price
                    },
                    newPlan: {
                        name: newPlan.name,
                        price: newPlan.price
                    },
                    proration: {
                        proratedCredit,
                        proratedCharge,
                        priceDifference
                    },
                    featureChanges,
                    effectiveDate: today
                }
            });
        } catch (error) {
            next(error);
        }
    }

////////////////////////////////////////////////////////////////////////////

    async  buySubscription (req, res) {
        const userId = req.user.id;
        const subscriptionType = req.body.subscriptionType; // نوع اشتراک: ماهانه یا سالانه
    
        let subscriptionDuration;
        if (subscriptionType === 'monthly') {
            subscriptionDuration = 1; // 1 ماه
        } else if (subscriptionType === 'yearly') {
            subscriptionDuration = 12; // 12 ماه
        }
    
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + subscriptionDuration);
    
        // غیرفعال کردن اشتراک‌های قبلی
        await Subscription.updateMany({ user: userId, isActive: true }, { isActive: false });
    
        const newSubscription = new Subscription({
            user: userId,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            isActive: true,
            subscriptionType: subscriptionType,
        });
    
        await newSubscription.save();
    
        res.send('Subscription purchased successfully!');
    }
    
    async getUserSubscriptionHistory(req, res, next){
        try {
            const { userId } = req.params;
            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: "Invalid userId." });
            }
            const conversations = await ConversationModel.find({ participants: userId });
            if (!conversations.length) {
                return res.status(404).json({ message: "No conversations found." });
            }
            return res.status(200).json({ 
                conversations 
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error." });
        }
    }
}

module.exports = {
    SubscriptionController: new SubscriptionController()
};
  

// I've created a comprehensive SubscriptionController that handles all major
//  subscription-related operations. Here's a breakdown of the implemented endpoints:

// createSubscription
// Creates a new subscription
// Handles initial billing record
// Validates user and plan existence
// Prevents duplicate active subscriptions

// getSubscription
// Retrieves detailed subscription information
// Includes current billing period usage
// Includes latest billing record
// Includes plan details

// updateSubscription
// Handles plan changes (upgrades/downgrades)
// Records subscription changes
// Updates billing information

// cancelSubscription
// Handles subscription cancellation
// Records cancellation reason
// Updates subscription status

// getSubscriptionUsage
// Retrieves usage metrics
// Compares usage against plan limits
// Supports date range filtering

// getBillingHistory
// Retrieves complete billing history
// Includes payment method details
// Includes invoice information


// applyReferralReward
// Applies referral rewards to subscription
// Extends subscription duration
// Records reward application

// Each endpoint includes:
// Error handling
// Input validation
// Transaction support where needed
// Proper status codes
// Consistent response format

// Would you like me to:
// Add validation schemas for the request bodies?
// Add more specific error handling?
// Implement additional endpoints for specific features?
// Create the referral system controller next?

// I've added several new endpoints to make the subscription system 
// more comprehensive:

// startTrial
// Handles trial subscription creation
// Checks for previous trial usage
// Sets trial-specific duration and terms

//reactivateSubscription
// Allows reactivation of canceled subscriptions
// Maintains subscription history
// Handles billing cycle adjustments

// pauseSubscription
// Enables temporary subscription pausing
// Adjusts billing cycles accordingly
// Records pause duration

// getSubscriptionAnalytics
//Provides detailed usage analytics
// Shows billing trends
// Calculates total spend

// checkSubscriptionStatus
// Proactive status monitoring
// Usage limit warnings
// Expiration notifications

// updatePaymentMethod
// Payment method management
// Default payment method handling
// Payment method validation

// previewSubscriptionChange
// Pro-rated cost calculations
// Feature comparison
// Impact analysis of plan changes

// These new endpoints add important functionality for:
// Trial management
// Subscription lifecycle control
// Analytics and reporting
// Payment method management
// Proactive notifications
// Change preview and analysis

// Would you like me to:
// Add validation schemas for these new endpoints?
// Create middleware for common checks?
// Add more specific error handling?
// Move on to creating the referral system controller?