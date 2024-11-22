const createHttpError = require("http-errors");
const { RandomNumberGenerator } = require("../../../utils/functions.js");
const { PrismaClient } = require("@prisma/client");
const crypto = require('crypto');
const prisma = new PrismaClient();
const { logger } = require("../../../utils/logger/winston.js");
const Sentry = require("@sentry/node");
const { redisClient } = require("../../../utils/initRedis.js");
const { SignAccessToken, SignRefreshToken, VerifyRefreshToken } = require("../../middlewares/authorizationSystem.js");

// Sentry initialization
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
});

class UserAuthService {
    constructor() {
        // Initialize transaction context for logging
        this.transactionContext = {};
    }

    // Helper method for structured logging
    logEvent(level, message, metadata = {}) {
        const enrichedMetadata = {
            ...metadata,
            timestamp: new Date(),
            service: 'UserAuthService',
            ...this.transactionContext
        };

        // Log to Winston
        logger[level](message, enrichedMetadata);

        // Log to Sentry based on level
        if (['error', 'warn'].includes(level)) {
            if (level === 'error') {
                Sentry.captureException(new Error(message), {
                    extra: enrichedMetadata
                });
            } else {
                Sentry.captureMessage(message, {
                    level: Sentry.Severity.Warning,
                    extra: enrichedMetadata
                });
            }
        }
    }

    generateHMAC(data) {
        try {
            const secret = process.env.HMAC_SECRET;
            const hmac = crypto
                .createHmac('sha256', secret)
                .update(data)
                .digest('hex');
            
            this.logEvent('debug', 'HMAC generated successfully', {
                action: 'generateHMAC',
                success: true
            });
            
            return hmac;
        } catch (error) {
            this.logEvent('error', 'HMAC generation failed', {
                action: 'generateHMAC',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async checkSuspiciousActivity(mobile, ip) {
        const suspiciousKey = `suspicious:${mobile}:${ip}`;
        
        try {
            const attempts = await redisClient.incr(suspiciousKey);
            await redisClient.expire(suspiciousKey, 3600);

            if (attempts > 10) {
                this.logEvent('warn', 'Suspicious activity detected', {
                    action: 'checkSuspiciousActivity',
                    mobile,
                    ip,
                    attempts
                });
                return true;
            }

            this.logEvent('info', 'Activity check completed', {
                action: 'checkSuspiciousActivity',
                mobile,
                ip,
                attempts,
                isSuspicious: false
            });
            
            return false;
        } catch (error) {
            this.logEvent('error', 'Error checking suspicious activity', {
                action: 'checkSuspiciousActivity',
                mobile,
                ip,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async requestOtp(mobile, ip) {
        const transaction = Sentry.startTransaction({
            op: 'requestOtp',
            name: 'Request OTP Operation'
        });

        try {
            this.transactionContext = { mobile, ip };
            
            const otpRequestKey = `otp_requests:${mobile}`;
            const requestsCount = await redisClient.incr(otpRequestKey);
            
            if (requestsCount === 1) {
                await redisClient.expire(otpRequestKey, 300);
            }

            if (requestsCount > 5) {
                this.logEvent('warn', 'OTP request limit exceeded', {
                    requestsCount,
                    action: 'requestOtp'
                });
                throw createHttpError.TooManyRequests('تعداد درخواست‌های کد تایید بیش از حد مجاز است');
            }

            const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
            if (isSuspicious) {
                throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
            }

            const code = RandomNumberGenerator();
            const result = await this.saveOtpToRedis(mobile, code);

            this.logEvent('info', 'OTP generated and saved', {
                action: 'requestOtp',
                success: true
            });

            if (!result) {
                throw createHttpError.Unauthorized("ورود شما انجام نشد");
            }

            return { code, mobile };
        } catch (error) {
            this.logEvent('error', 'OTP request failed', {
                action: 'requestOtp',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async verifyOtp(mobile, code, ip) {
        const transaction = Sentry.startTransaction({
            op: 'verifyOtp',
            name: 'Verify OTP Operation'
        });

        try {
            this.transactionContext = { mobile, ip };

            const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
            if (isSuspicious) {
                throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
            }

            const storedOtp = await redisClient.get(`otp:${mobile}`);
            if (!storedOtp) {
                this.logEvent('warn', 'OTP expired or not found', {
                    action: 'verifyOtp'
                });
                throw createHttpError.Unauthorized("کد منقضی شده یا یافت نشد");
            }

            if (storedOtp !== code) {
                this.logEvent('warn', 'Invalid OTP provided', {
                    action: 'verifyOtp'
                });
                throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");
            }

            let user = await this.getUserFromCache(mobile);
            let isNewUser = false;

            if (!user) {
                const span = transaction.startChild({
                    op: 'createNewUser',
                    description: 'Create new user with notification settings'
                });

                try {
                    const result = await prisma.$transaction(async (prismaTx) => {
                        const newUser = await this.createOrUpdateUser(mobile, prismaTx);
                        
                        await prismaTx.userNotificationSettings.create({
                            data: {
                                userId: newUser.id,
                                emailNotifications: true,
                                pushNotifications: true,
                                smsNotifications: true,
                                marketingEmails: true,
                                deviceTokens: []
                            }
                        });

                        const category = await prismaTx.notificationCategory.upsert({
                            where: { category: 'GENERAL' },
                            update: {},
                            create: { category: 'GENERAL' }
                        });

                        await prismaTx.notification.create({
                            data: {
                                userId: newUser.id,
                                type: 'SYSTEM',
                                title: 'خوش آمدید به سامانه',
                                message: `${mobile} عزیز، به سامانه ما خوش آمدید. امیدواریم تجربه خوبی داشته باشید.`,
                                priority: 'NORMAL',
                                status: 'PENDING',
                                metadata: {
                                    userMobile: mobile,
                                    registrationIP: ip,
                                    isFirstLogin: true
                                },
                                source: 'AUTH_SERVICE',
                                categoryId: category.id
                            }
                        });

                        return newUser;
                    });

                    user = result;
                    isNewUser = true;

                    this.logEvent('info', 'New user created successfully', {
                        action: 'verifyOtp',
                        userId: user.id,
                        isNewUser: true
                    });
                } finally {
                    span.finish();
                }
            }

            const tokenData = {
                userId: user.id,
                timestamp: Date.now()
            };

            const hmac = this.generateHMAC(JSON.stringify(tokenData));
            const accessToken = await SignAccessToken(user.id, hmac);
            const refreshToken = await SignRefreshToken(user.id, hmac);

            this.logEvent('info', 'Login successful', {
                action: 'verifyOtp',
                userId: user.id,
                isNewUser
            });

            await redisClient.del(`otp:${mobile}`);
            await redisClient.del(`otp_requests:${mobile}`);

            return { accessToken, refreshToken };
        } catch (error) {
            this.logEvent('error', 'OTP verification failed', {
                action: 'verifyOtp',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    // ... سایر متدها با همین الگوی لاگینگ

    async updateUserStatus(adminId, userId, status, reason) {
        const transaction = Sentry.startTransaction({
            op: 'updateUserStatus',
            name: 'Update User Status Operation'
        });

        try {
            this.transactionContext = { adminId, userId, status };

            const admin = await prisma.user.findUnique({
                where: { id: adminId }
            });

            if (!admin.isSystemAdmin) {
                this.logEvent('warn', 'Unauthorized admin access attempt', {
                    action: 'updateUserStatus',
                    adminId
                });
                throw createHttpError.Forbidden("شما دسترسی لازم را ندارید");
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    status,
                    isSuspended: status === 'SUSPENDED'
                }
            });

            await prisma.userStatusLog.create({
                data: {
                    userId,
                    adminId,
                    oldStatus: user.status,
                    newStatus: status,
                    reason
                }
            });

            if (status === 'SUSPENDED') {
                await this.invalidateAllUserTokens(userId);
            }

            this.logEvent('info', 'User status updated successfully', {
                action: 'updateUserStatus',
                userId,
                oldStatus: user.status,
                newStatus: status,
                updatedBy: adminId
            });

            return user;
        } catch (error) {
            this.logEvent('error', 'Failed to update user status', {
                action: 'updateUserStatus',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async createOrUpdateUser(mobile, prismaTx) {
        const transaction = Sentry.startTransaction({
            op: 'createOrUpdateUser',
            name: 'Create or Update User Operation'
        });

        try {
            this.transactionContext = { mobile };
            
            let user = await this.getUserFromCache(mobile);
            if (!user) {
                const span = transaction.startChild({
                    op: 'findUserInDB',
                    description: 'Find user in database'
                });

                user = await prismaTx.user.findUnique({
                    where: { mobile },
                    select: {
                        id: true,
                        mobile: true,
                        isActive: true,
                        isSystemAdmin: true,
                        userProfile: {
                            select: {
                                first_name: true,
                                last_name: true,
                                province: true,
                                city: true
                            }
                        }
                    }
                });
                span.finish();

                if (!user) {
                    const createSpan = transaction.startChild({
                        op: 'createNewUser',
                        description: 'Create new user and profile'
                    });

                    user = await prismaTx.$transaction(async (tx) => {
                        const newUser = await tx.user.create({
                            data: { mobile }
                        });

                        await tx.userProfile.create({
                            data: {
                                userId: newUser.id
                            }
                        });

                        this.logEvent('info', 'New user created', {
                            action: 'createOrUpdateUser',
                            userId: newUser.id
                        });

                        return newUser;
                    });

                    createSpan.finish();
                }

                const cacheTime = user.isSystemAdmin ? 1800 : 3600;
                await this.cacheUserWithTTL(user, cacheTime);
            }

            return user;
        } catch (error) {
            this.logEvent('error', 'Failed to create or update user', {
                action: 'createOrUpdateUser',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async completeUserProfile(userId, profileData) {
        const transaction = Sentry.startTransaction({
            op: 'completeUserProfile',
            name: 'Complete User Profile Operation'
        });

        try {
            this.transactionContext = { userId };
            const {
                first_name,
                last_name,
                nationalIdNumber,
                province,
                city,
                bussinesRole,
                expertices
            } = profileData;

            const existingProfile = await prisma.userProfile.findUnique({
                where: { userId }
            });

            if (existingProfile) {
                this.logEvent('warn', 'Profile already exists', {
                    action: 'completeUserProfile',
                    userId
                });
                throw createHttpError.BadRequest("پروفایل قبلاً تکمیل شده است");
            }

            const [userProfile, businessProfile] = await prisma.$transaction([
                prisma.userProfile.create({
                    data: {
                        userId,
                        first_name,
                        last_name,
                        nationalIdNumber,
                        province,
                        city
                    }
                }),
                prisma.businessProfile.create({
                    data: {
                        userId,
                        bussinesRole,
                        expertices
                    }
                })
            ]);

            await this.cacheUser({
                ...userProfile,
                businessProfile
            });

            this.logEvent('info', 'User profile completed successfully', {
                action: 'completeUserProfile',
                userId,
                profileId: userProfile.id,
                businessProfileId: businessProfile.id
            });

            return { userProfile, businessProfile };
        } catch (error) {
            this.logEvent('error', 'Failed to complete user profile', {
                action: 'completeUserProfile',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async updateLocationInfo(userId, locationData) {
        const transaction = Sentry.startTransaction({
            op: 'updateLocationInfo',
            name: 'Update Location Information'
        });

        try {
            this.transactionContext = { userId };
            const {
                province,
                city,
                location,
                garageLat_Lng,
                supplierStoreLat_Lng
            } = locationData;

            const updatedProfile = await prisma.userProfile.update({
                where: { userId },
                data: {
                    province,
                    city,
                    location,
                    garageLat_Lng,
                    supplierStoreLat_Lng
                }
            });

            this.logEvent('info', 'Location information updated', {
                action: 'updateLocationInfo',
                userId,
                province,
                city
            });

            return updatedProfile;
        } catch (error) {
            this.logEvent('error', 'Failed to update location information', {
                action: 'updateLocationInfo',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async updateFinancialInfo(userId, { nationalIdNumber, bankAccountNumber }) {
        const transaction = Sentry.startTransaction({
            op: 'updateFinancialInfo',
            name: 'Update Financial Information'
        });

        try {
            this.transactionContext = { userId };

            const existingProfile = await prisma.userProfile.findFirst({
                where: {
                    OR: [
                        { nationalIdNumber },
                        { bankAccountNumber }
                    ],
                    NOT: {
                        userId
                    }
                }
            });

            if (existingProfile) {
                this.logEvent('warn', 'Duplicate financial information detected', {
                    action: 'updateFinancialInfo',
                    userId,
                    conflictingUserId: existingProfile.userId
                });
                throw createHttpError.Conflict("اطلاعات وارد شده تکراری است");
            }

            const updatedProfile = await prisma.userProfile.update({
                where: { userId },
                data: {
                    nationalIdNumber,
                    bankAccountNumber
                }
            });

            this.logEvent('info', 'Financial information updated successfully', {
                action: 'updateFinancialInfo',
                userId
            });

            return updatedProfile;
        } catch (error) {
            this.logEvent('error', 'Failed to update financial information', {
                action: 'updateFinancialInfo',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async updateUserRoles(adminId, userId, roles) {
        const transaction = Sentry.startTransaction({
            op: 'updateUserRoles',
            name: 'Update User Roles'
        });

        try {
            this.transactionContext = { adminId, userId };

            const admin = await prisma.user.findUnique({
                where: { id: adminId }
            });

            if (!admin.isSystemAdmin) {
                this.logEvent('warn', 'Unauthorized role update attempt', {
                    action: 'updateUserRoles',
                    adminId,
                    targetUserId: userId
                });
                throw createHttpError.Forbidden("شما دسترسی لازم را ندارید");
            }

            await prisma.userRole.deleteMany({
                where: { userId }
            });

            const newRoles = await prisma.userRole.createMany({
                data: roles.map(role => ({
                    userId,
                    role
                }))
            });

            this.logEvent('info', 'User roles updated successfully', {
                action: 'updateUserRoles',
                userId,
                updatedBy: adminId,
                newRoles: roles
            });

            return newRoles;
        } catch (error) {
            this.logEvent('error', 'Failed to update user roles', {
                action: 'updateUserRoles',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async requestAccountDeletion(userId, reason) {
        const transaction = Sentry.startTransaction({
            op: 'requestAccountDeletion',
            name: 'Request Account Deletion'
        });

        try {
            this.transactionContext = { userId };

            await prisma.accountDeletionRequest.create({
                data: {
                    userId,
                    reason,
                    status: 'PENDING'
                }
            });

            await prisma.notification.create({
                data: {
                    userId: null,
                    type: 'DELETION_REQUEST',
                    content: `درخواست حذف حساب کاربری جدید از کاربر ${userId}`
                }
            });

            this.logEvent('info', 'Account deletion requested', {
                action: 'requestAccountDeletion',
                userId,
                reason
            });

            return true;
        } catch (error) {
            this.logEvent('error', 'Failed to request account deletion', {
                action: 'requestAccountDeletion',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }

    async cleanupExpiredCaches() {
        const transaction = Sentry.startTransaction({
            op: 'cleanupExpiredCaches',
            name: 'Cleanup Expired Caches'
        });

        try {
            const cacheKeys = await redisClient.SMEMBERS('active_user_caches');
            let cleanedCount = 0;

            for (const key of cacheKeys) {
                const exists = await redisClient.EXISTS(key);
                if (!exists) {
                    await redisClient.SREM('active_user_caches', key);
                    cleanedCount++;
                }
            }

            this.logEvent('info', 'Cache cleanup completed', {
                action: 'cleanupExpiredCaches',
                totalChecked: cacheKeys.length,
                cleaned: cleanedCount
            });
        } catch (error) {
            this.logEvent('error', 'Cache cleanup failed', {
                action: 'cleanupExpiredCaches',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            transaction.finish();
        }
    }
}


module.exports = {
    UserAuthService
};