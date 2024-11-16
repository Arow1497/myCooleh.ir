const createHttpError = require("http-errors");
const { RandomNumberGenerator } = require("../../../utils/functions.js");
const { PrismaClient } = require("@prisma/client");
const crypto = require('crypto');
const winston = require('winston');
const prisma = new PrismaClient();
const redisClient = require("../../../utils/initRedis.js");
const { SignAccessToken, SignRefreshToken, VerifyRefreshToken } = require("../../middlewares/authorizationSystem.js");

class UserAuthService {
    constructor() {
        this.logger = winston.createLogger({
            format: winston.format.json(),
            transports: [
                new winston.transports.File({ filename: 'error.log', level: 'error' }),
                new winston.transports.File({ filename: 'security.log', level: 'warn' }),
                new winston.transports.File({ filename: 'combined.log' })
            ]
        });
    }

    generateHMAC(data) {
        const secret = process.env.HMAC_SECRET;
        return crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
    }

    async checkSuspiciousActivity(mobile, ip) {
        const suspiciousKey = `suspicious:${mobile}:${ip}`;
        const attempts = await redisClient.incr(suspiciousKey);
        await redisClient.expire(suspiciousKey, 3600);

        if (attempts > 10) {
            this.logger.warn('Suspicious Activity Detected', {
                mobile, ip, attempts, timestamp: new Date()
            });
            return true;
        }
        return false;
    }

    async requestOtp(mobile, ip) {
        
        const otpRequestKey = `otp_requests:${mobile}`;
        const requestsCount = await redisClient.incr(otpRequestKey);
        
        if (requestsCount === 1) {
            await redisClient.expire(otpRequestKey, 300);
        }

        if (requestsCount > 5) {
            this.logger.warn('OTP Request Limit Exceeded', { mobile, ip });
            throw createHttpError.TooManyRequests('تعداد درخواست‌های کد تایید بیش از حد مجاز است');
        }

        const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
        if (isSuspicious) {
            throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
        }

        const code = RandomNumberGenerator();
        const result = await this.saveOtpToRedis(mobile, code);

        this.logger.info('OTP Requested', {
            mobile, ip, timestamp: new Date()
        });

        if (!result) throw createHttpError.Unauthorized("ورود شما انجام نشد");

        return { code, mobile };
    }

    async verifyOtp(mobile, code, ip) {
        const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
        if (isSuspicious) {
            throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
        }

        const storedOtp = await redisClient.get(`otp:${mobile}`);
        if (!storedOtp) throw createHttpError.Unauthorized("کد منقضی شده یا یافت نشد");
        if (storedOtp !== code) {
            this.logger.warn('Failed OTP Attempt', {
                mobile, ip, timestamp: new Date()
            });
            throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");
        }

        let user = await this.getUserFromCache(mobile);
        if (!user) {
            user = await this.createOrUpdateUser(mobile);
        }

        const tokenData = {
            userId: user.id,
            timestamp: Date.now()
        };
        const hmac = this.generateHMAC(JSON.stringify(tokenData));
        const accessToken = await SignAccessToken(user.id, hmac);
        const refreshToken = await SignRefreshToken(user.id, hmac);

        this.logger.info('Successful Login', {
            userId: user.id,
            mobile,
            ip,
            timestamp: new Date()
        });

        await redisClient.del(`otp:${mobile}`);
        await redisClient.del(`otp_requests:${mobile}`);

        return { accessToken, refreshToken };
    }

    async createOrUpdateUser(mobile) {
        let user = await this.getUserFromCache(mobile);
        if (!user) {
            user = await prisma.user.findUnique({
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

            if (!user) {
                const result = await prisma.$transaction([
                    prisma.user.create({
                        data: { mobile }
                    }),
                    prisma.userProfile.create({
                        data: {
                            userId: user.id
                        }
                    })
                ]);
                user = result[0];
            }

            const cacheTime = user.isSystemAdmin ? 1800 : 3600;
            await this.cacheUserWithTTL(user, cacheTime);
        }
        return user;
    }

    async generateTokens(userId, hmac) {
        const accessToken = await SignAccessToken(userId, hmac);
        const refreshToken = await SignRefreshToken(userId, hmac);
        return { accessToken, refreshToken };
    }

    async addToBlacklist(token) {
        try {
            const ttl = 365 * 24 * 60 * 60;
            await redisClient.SETEX(`blacklist:${token}`, ttl, true);
        } catch (error) {
            this.logger.error("Error adding token to blacklist:", error);
        }
    }

    async isTokenBlacklisted(token) {
        try {
            const result = await redisClient.get(`blacklist:${token}`);
            return !!result;
        } catch (error) {
            this.logger.error("Error checking token in blacklist:", error);
            return false;
        }
    }

    async cacheUser(user) {
        try {
            const ttl = 3600;
            await redisClient.SETEX(`user:${user.mobile}`, ttl, JSON.stringify(user));
        } catch (error) {
            this.logger.error("Error caching user data:", error);
        }
    }

    async getUserFromCache(mobile) {
        try {
            const cachedUser = await redisClient.get(`user:${mobile}`);
            return cachedUser ? JSON.parse(cachedUser) : null;
        } catch (error) {
            this.logger.error("Error retrieving user from cache:", error);
            return null;
        }
    }

    async cacheUserWithTTL(user, ttl) {
        try {
            const cacheKey = `user:${user.mobile}`;
            const userData = {
                ...user,
                cached_at: Date.now()
            };
            await redisClient.SETEX(cacheKey, ttl, JSON.stringify(userData));
            await redisClient.SADD('active_user_caches', cacheKey);
        } catch (error) {
            this.logger.error('Cache Error', { error: error.message });
        }
    }

    async cleanupExpiredCaches() {
        try {
            const cacheKeys = await redisClient.SMEMBERS('active_user_caches');
            for (const key of cacheKeys) {
                const exists = await redisClient.EXISTS(key);
                if (!exists) {
                    await redisClient.SREM('active_user_caches', key);
                }
            }
        } catch (error) {
            this.logger.error('Cache Cleanup Error', { error: error.message });
        }
    }

    async invalidateAllUserTokens(userId) {
        try {
            const pattern = `user_tokens:${userId}:*`;
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            this.logger.error("Error invalidating user tokens:", error);
        }
    }

    async checkRateLimit(mobile) {
        try {
            const currentCount = await redisClient.incr(`rate_limit:${mobile}`);
            if (currentCount === 1) {
                await redisClient.expire(`rate_limit:${mobile}`, 60);
            }
            return currentCount > 5;
        } catch (error) {
            this.logger.error("Error checking rate limit:", error);
            return false;
        }
    }

    async refreshUserToken(refreshToken) {
        const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
        if (isBlacklisted) throw createHttpError.Unauthorized("توکن معتبر نمی‌باشد.");

        const mobile = await VerifyRefreshToken(refreshToken);
        let user = await this.getUserFromCache(mobile);
        
        if (!user) {
            user = await prisma.user.findUnique({ where: { mobile } });
            if (user) {
                await this.cacheUser(user);
            }
        }

        const accessToken = await SignAccessToken(user.id);
        const newRefreshToken = await SignRefreshToken(user.id);

        return { accessToken, refreshToken: newRefreshToken };
    }

    async logoutUser(refreshToken) {
        if (!refreshToken) throw createHttpError.BadRequest("توکن ورود لازم است");
        await this.addToBlacklist(refreshToken);
        return true;
    }

    async saveOtpToRedis(mobile, otp) {
        try {
            const ttl = 120;
            const otpStr = String(otp);
            await redisClient.SETEX(`otp:${mobile}`, ttl, otpStr);
            return true;
        } catch (error) {
            console.error("Error saving OTP to Redis:", error);
            return false;
        }
    }

    async completeUserProfile(userId, profileData) {
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

        return { userProfile, businessProfile };
    }

    async updateUserMobile(userId, newMobile, code) {
        const storedOtp = await redisClient.get(`otp:${newMobile}`);
        if (!storedOtp || storedOtp !== code) {
            throw createHttpError.Unauthorized("کد تایید نامعتبر است");
        }

        const existingUser = await prisma.user.findUnique({
            where: { mobile: newMobile }
        });

        if (existingUser) {
            throw createHttpError.Conflict("این شماره موبایل قبلاً ثبت شده است");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { mobile: newMobile }
        });

        await this.cacheUser(updatedUser);
        await redisClient.del(`otp:${newMobile}`);

        return updatedUser;
    }

    async deactivateUserAccount(userId) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { 
                isActive: false,
                deactivatedAt: new Date()
            }
        });

        await this.invalidateAllUserTokens(userId);
        await redisClient.del(`user:${user.mobile}`);

        return user;
    }

    async reactivateUserAccount(mobile, code) {
        const storedOtp = await redisClient.get(`otp:${mobile}`);
        if (!storedOtp || storedOtp !== code) {
            throw createHttpError.Unauthorized("کد تایید نامعتبر است");
        }

        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        if (!user || user.isActive) {
            throw createHttpError.BadRequest("حساب کاربری یافت نشد یا در حال حاضر فعال است");
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { 
                isActive: true,
                deactivatedAt: null
            }
        });

        const accessToken = await SignAccessToken(user.id);
        const refreshToken = await SignRefreshToken(user.id);

        await this.cacheUser(updatedUser);

        return {
            user: updatedUser,
            accessToken,
            refreshToken
        };
    }

    async updateBusinessProfileInfo(userId, profileData) {
        const {
            mechanicPercentage,
            apprenticePercentage,
            bussinesRole,
            expertices
        } = profileData;

        const businessProfile = await prisma.businessProfile.upsert({
            where: { userId },
            update: {
                mechanicPercentage,
                apprenticePercentage,
                bussinesRole,
                expertices
            },
            create: {
                userId,
                mechanicPercentage,
                apprenticePercentage,
                bussinesRole,
                expertices
            }
        });

        const user = await this.getUserFromCache(userId);
        if (user) {
            user.businessProfile = businessProfile;
            await this.cacheUser(user);
        }

        return businessProfile;
    }

    async updateSocialProfileInfo(userId, socialLinks) {
        return await prisma.socialProfile.upsert({
            where: { userId },
            update: { socialLinks },
            create: {
                userId,
                socialLinks
            }
        });
    }

    async updateLocationInfo(userId, locationData) {
        const {
            province,
            city,
            location,
            garageLat_Lng,
            supplierStoreLat_Lng
        } = locationData;

        return await prisma.userProfile.update({
            where: { userId },
            data: {
                province,
                city,
                location,
                garageLat_Lng,
                supplierStoreLat_Lng
            }
        });
    }

    async updateFinancialInfo(userId, { nationalIdNumber, bankAccountNumber }) {
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
            throw createHttpError.Conflict("اطلاعات وارد شده تکراری است");
        }

        return await prisma.userProfile.update({
            where: { userId },
            data: {
                nationalIdNumber,
                bankAccountNumber
            }
        });
    }

    async updateUserStatus(adminId, userId, status, reason) {
        const admin = await prisma.user.findUnique({
            where: { id: adminId }
        });

        if (!admin.isSystemAdmin) {
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

        return user;
    }

    async updateProfileMedia(userId, { profileImageUrl, coverImageUrl }) {
        return await prisma.userProfile.update({
            where: { userId },
            data: {
                profileImageUrl,
                coverImageUrl,
                media: {
                    create: {
                        url: profileImageUrl,
                        type: 'PROFILE'
                    }
                }
            }
        });
    }

    async updateUserRoles(adminId, userId, roles) {
        const admin = await prisma.user.findUnique({
            where: { id: adminId }
        });

        if (!admin.isSystemAdmin) {
            throw createHttpError.Forbidden("شما دسترسی لازم را ندارید");
        }

        await prisma.userRole.deleteMany({
            where: { userId }
        });

        return await prisma.userRole.createMany({
            data: roles.map(role => ({
                userId,
                role
            }))
        });
    }

    async resetUserPassword(mobile, code, newPassword) {
        const storedOtp = await redisClient.get(`otp:${mobile}`);
        if (!storedOtp || storedOtp !== code) {
            throw createHttpError.Unauthorized("کد تایید نامعتبر است");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await prisma.user.update({
            where: { mobile },
            data: {
                password: hashedPassword,
                passwordResetAt: new Date()
            }
        });

        await this.invalidateAllUserTokens(user.id);
        return user;
    }

    async requestAccountDeletion(userId, reason) {
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

        return true;
    }
}
module.exports = {
    UserAuthService
};

