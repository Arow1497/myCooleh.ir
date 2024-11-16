const createHttpError = require("http-errors");
const { PrismaClient } = require("@prisma/client");
const crypto = require('crypto');
const winston = require('winston');
const prisma = new PrismaClient();
const redisClient = require("../../../utils/initRedis.js");
const { SignAccessToken, SignRefreshToken } = require("../../middlewares/authorizationSystem.js");

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
                mobile,
                ip,
                attempts,
                timestamp: new Date()
            });
            return true;
        }
        return false;
    }

    async saveOtpToRedis(mobile, code) {
        try {
            const ttl = 120;
            const otpStr = String(code);
            await redisClient.SETEX(`otp:${mobile}`, ttl, otpStr);
            return true;
        } catch (error) {
            this.logger.error("Error saving OTP to Redis:", error);
            return false;
        }
    }

    async verifyOtp(mobile, code) {
        const storedOtp = await redisClient.get(`otp:${mobile}`);
        if (!storedOtp) throw createHttpError.Unauthorized("کد منقضی شده یا یافت نشد");
        if (storedOtp !== code) {
            this.logger.warn('Failed OTP Attempt', {
                mobile,
                timestamp: new Date()
            });
            throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");
        }
        return true;
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
}

module.exports = new UserAuthService();