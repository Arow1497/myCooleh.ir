const createHttpError = require("http-errors");
const { RandomNumberGenerator } = require("../../../utils/functions.js");
const { PrismaClient } = require("@prisma/client");
const crypto = require('crypto');
const prisma = new PrismaClient();
const {logger} = require("../../../utils/logger/winston.js")
const {redisClient} = require("../../../utils/initRedis.js");
const { SignAccessToken, SignRefreshToken, VerifyRefreshToken } = require("../../middlewares/authorizationSystem.middleware.js");

class ClientAuthService {
 
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
            logger.warn('Suspicious Activity Detected', {
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
            logger.warn('OTP Request Limit Exceeded', { mobile, ip });
            throw createHttpError.TooManyRequests('تعداد درخواست‌های کد تایید بیش از حد مجاز است');
        }

        const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
        if (isSuspicious) {
            throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
        }

        const code = RandomNumberGenerator();
        const result = await this.saveOtpToRedis(mobile, code);

        logger.info('OTP Requested', {
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
            logger.warn('Failed OTP Attempt', {
                mobile, ip, timestamp: new Date()
            });
            throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");
        }
    
        let client = await this.getClientFromCache(mobile);
        let isNewClient = false;
        if (!client) {
        // ایجاد کاربر جدید همراه با تنظیمات نوتیفیکیشن در یک تراکنش
        const result = await prisma.$transaction(async (prismaTx) => {
            // ایجاد یا به‌روزرسانی کاربر
            const newClient = await this.createOrUpdateClient(mobile, prismaTx);
            // ایجاد تنظیمات نوتیفیکیشن برای کاربر جدید
            await prismaTx.clientNotificationSettings.create({
                data: {
                    clientId: newClient.id, // از newClient.id استفاده می‌کنیم
                    emailNotifications: true,
                    pushNotifications: true,
                    smsNotifications: true,
                    marketingEmails: true,
                    deviceTokens: []
                }
            });
            // بررسی یا ایجاد دسته‌بندی نوتیفیکیشن
            const category = await prismaTx.notificationCategory.upsert({
                where: { category: 'GENERAL' },
                update: {},
                create: { category: 'GENERAL' }
            });
            // ایجاد نوتیفیکیشن خوشامدگویی
            await prismaTx.notification.create({
                data: {
                    clientId: newClient.id, // از شناسه کاربر جدید استفاده می‌کنیم
                    type: 'SYSTEM',
                    title: 'خوش آمدید به سامانه',
                    message: `${mobile} عزیز، به سامانه ما خوش آمدید. امیدواریم تجربه خوبی داشته باشید.`,
                    priority: 'NORMAL',
                    status: 'PENDING',
                    metadata: {
                        clientMobile: mobile,
                        registrationIP: ip,
                        isFirstLogin: true
                    },
                    source: 'AUTH_SERVICE',
                    categoryId: category.id // استفاده از دسته‌بندی موجود
                }
            });
    
            return newClient; // بازگرداندن کاربر جدید
        });
    
        client = result;
        isNewClient = true;
    }

        const tokenData = {
            clientId: client.id,
            timestamp: Date.now()
        };
        const hmac = this.generateHMAC(JSON.stringify(tokenData));
        const accessToken = await SignAccessToken(client.id, hmac);
        const refreshToken = await SignRefreshToken(client.id, hmac);
    
        logger.info('Successful Login', {
            clientId: client.id,
            mobile,
            ip,
            timestamp: new Date(),
            isNewClient
        });
    
        await redisClient.del(`otp:${mobile}`);
        await redisClient.del(`otp_requests:${mobile}`);
    
        return { accessToken, refreshToken };
    }

    async createOrUpdateClient(mobile) {
        let client = await this.getClientFromCache(mobile);
        if (!client) {
            client = await prisma.client.findUnique({
                where: { mobile },
                select: {
                    id: true,
                    mobile: true,
                    isActive: true,
                    isSystemAdmin: true,
                    clientProfile: {
                        select: {
                            first_name: true,
                            last_name: true,
                            province: true,
                            city: true
                        }
                    }
                }
            });
    
            if (!client) {
                // تراکنش فانکشنال برای ایجاد کاربر و پروفایل کاربر
                client = await prisma.$transaction(async (prismaTx) => {
                    const newClient = await prismaTx.client.create({
                        data: { mobile }
                    });
    
                    await prismaTx.clientProfile.create({
                        data: {
                            clientId: newClient.id
                        }
                    });
    
                    return newClient; // بازگشت کاربر جدید
                });
            }
    
            // تنظیم TTL کش بر اساس نوع کاربر
            const cacheTime = client.isSystemAdmin ? 1800 : 3600;
            await this.cacheClientWithTTL(client, cacheTime);
        }
        return client;
    }

    async generateTokens(clientId, hmac) {
        const accessToken = await SignAccessToken(clientId, hmac);
        const refreshToken = await SignRefreshToken(clientId, hmac);
        return { accessToken, refreshToken };
    }

    async addToBlacklist(token) {
        try {
            const ttl = 365 * 24 * 60 * 60;
            await redisClient.SETEX(`blacklist:${token}`, ttl, true);
        } catch (error) {
            logger.error("Error adding token to blacklist:", error);
        }
    }

    async isTokenBlacklisted(token) {
        try {
            const result = await redisClient.get(`blacklist:${token}`);
            return !!result;
        } catch (error) {
            logger.error("Error checking token in blacklist:", error);
            return false;
        }
    }

    async cacheClient(client) {
        try {
            const ttl = 3600;
            await redisClient.SETEX(`client:${client.mobile}`, ttl, JSON.stringify(client));
        } catch (error) {
            logger.error("Error caching client data:", error);
        }
    }

    async getClientFromCache(mobile) {
        try {
            const cachedClient = await redisClient.get(`client:${mobile}`);
            return cachedClient ? JSON.parse(cachedClient) : null;
        } catch (error) {
            logger.error("Error retrieving client from cache:", error);
            return null;
        }
    }

    async cacheClientWithTTL(client, ttl) {
        try {
            const cacheKey = `client:${client.mobile}`;
            const clientData = {
                ...client,
                cached_at: Date.now()
            };
            await redisClient.SETEX(cacheKey, ttl, JSON.stringify(clientData));
            await redisClient.SADD('active_client_caches', cacheKey);
        } catch (error) {
            logger.error('Cache Error', { error: error.message });
        }
    }

    async cleanupExpiredCaches() {
        try {
            const cacheKeys = await redisClient.SMEMBERS('active_client_caches');
            for (const key of cacheKeys) {
                const exists = await redisClient.EXISTS(key);
                if (!exists) {
                    await redisClient.SREM('active_client_caches', key);
                }
            }
        } catch (error) {
            logger.error('Cache Cleanup Error', { error: error.message });
        }
    }

    async invalidateAllClientTokens(clientId) {
        try {
            const pattern = `client_tokens:${clientId}:*`;
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error("Error invalidating client tokens:", error);
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
            logger.error("Error checking rate limit:", error);
            return false;
        }
    }

    async refreshClientToken(refreshToken) {
        const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
        if (isBlacklisted) throw createHttpError.Unauthorized("توکن معتبر نمی‌باشد.");

        const mobile = await VerifyRefreshToken(refreshToken);
        let client = await this.getClientFromCache(mobile);
        
        if (!client) {
            client = await prisma.client.findUnique({ where: { mobile } });
            if (client) {
                await this.cacheClient(client);
            }
        }

        const accessToken = await SignAccessToken(client.id);
        const newRefreshToken = await SignRefreshToken(client.id);

        return { accessToken, refreshToken: newRefreshToken };
    }

    async logoutClient(refreshToken) {
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

    async completeClientProfile(clientId, profileData) {
        const {
            first_name,
            last_name,
            nationalIdNumber,
            province,
            city,
            bussinesRole,
            expertices
        } = profileData;

        const existingProfile = await prisma.clientProfile.findUnique({
            where: { clientId }
        });

        if (existingProfile) {
            throw createHttpError.BadRequest("پروفایل قبلاً تکمیل شده است");
        }

        const [clientProfile, businessProfile] = await prisma.$transaction([
            prisma.clientProfile.create({
                data: {
                    clientId,
                    first_name,
                    last_name,
                    nationalIdNumber,
                    province,
                    city
                }
            }),
            prisma.businessProfile.create({
                data: {
                    clientId,
                    bussinesRole,
                    expertices
                }
            })
        ]);

        await this.cacheClient({
            ...clientProfile,
            businessProfile
        });

        return { clientProfile, businessProfile };
    }

    async updateClientMobile(clientId, newMobile, code) {
        const storedOtp = await redisClient.get(`otp:${newMobile}`);
        if (!storedOtp || storedOtp !== code) {
            throw createHttpError.Unauthorized("کد تایید نامعتبر است");
        }

        const existingClient = await prisma.client.findUnique({
            where: { mobile: newMobile }
        });

        if (existingClient) {
            throw createHttpError.Conflict("این شماره موبایل قبلاً ثبت شده است");
        }

        const updatedClient = await prisma.client.update({
            where: { id: clientId },
            data: { mobile: newMobile }
        });

        await this.cacheClient(updatedClient);
        await redisClient.del(`otp:${newMobile}`);

        return updatedClient;
    }

    async deactivateClientAccount(clientId) {
        const client = await prisma.client.update({
            where: { id: clientId },
            data: { 
                isActive: false,
                deactivatedAt: new Date()
            }
        });

        await this.invalidateAllClientTokens(clientId);
        await redisClient.del(`client:${client.mobile}`);

        return client;
    }

    async reactivateClientAccount(mobile, code) {
        const storedOtp = await redisClient.get(`otp:${mobile}`);
        if (!storedOtp || storedOtp !== code) {
            throw createHttpError.Unauthorized("کد تایید نامعتبر است");
        }

        const client = await prisma.client.findUnique({
            where: { mobile }
        });

        if (!client || client.isActive) {
            throw createHttpError.BadRequest("حساب کاربری یافت نشد یا در حال حاضر فعال است");
        }

        const updatedClient = await prisma.client.update({
            where: { id: client.id },
            data: { 
                isActive: true,
                deactivatedAt: null
            }
        });

        const accessToken = await SignAccessToken(client.id);
        const refreshToken = await SignRefreshToken(client.id);

        await this.cacheClient(updatedClient);

        return {
            client: updatedClient,
            accessToken,
            refreshToken
        };
    }

    async updateLocationInfo(clientId, locationData) {
        const {
            province,
            city,
            location,
            garageLat_Lng,
            supplierStoreLat_Lng
        } = locationData;

        return await prisma.clientProfile.update({
            where: { clientId },
            data: {
                province,
                city,
                location,
                garageLat_Lng,
                supplierStoreLat_Lng
            }
        });
    }

    async updateClientStatus(adminId, clientId, status, reason) {
        const admin = await prisma.client.findUnique({
            where: { id: adminId }
        });

        if (!admin.isSystemAdmin) {
            throw createHttpError.Forbidden("شما دسترسی لازم را ندارید");
        }

        const client = await prisma.client.update({
            where: { id: clientId },
            data: {
                status,
                isSuspended: status === 'SUSPENDED'
            }
        });

        await prisma.clientStatusLog.create({
            data: {
                clientId,
                adminId,
                oldStatus: client.status,
                newStatus: status,
                reason
            }
        });

        if (status === 'SUSPENDED') {
            await this.invalidateAllClientTokens(clientId);
        }

        return client;
    }

    async updateProfileMedia(clientId, { profileImageUrl, coverImageUrl }) {
        return await prisma.clientProfile.update({
            where: { clientId },
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

    async updateClientRoles(adminId, clientId, roles) {
        const admin = await prisma.client.findUnique({
            where: { id: adminId }
        });

        if (!admin.isSystemAdmin) {
            throw createHttpError.Forbidden("شما دسترسی لازم را ندارید");
        }

        await prisma.clientRole.deleteMany({
            where: { clientId }
        });

        return await prisma.clientRole.createMany({
            data: roles.map(role => ({
                clientId,
                role
            }))
        });
    }

    async resetClientPassword(mobile, code, newPassword) {
        const storedOtp = await redisClient.get(`otp:${mobile}`);
        if (!storedOtp || storedOtp !== code) {
            throw createHttpError.Unauthorized("کد تایید نامعتبر است");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const client = await prisma.client.update({
            where: { mobile },
            data: {
                password: hashedPassword,
                passwordResetAt: new Date()
            }
        });

        await this.invalidateAllClientTokens(client.id);
        return client;
    }

    async requestAccountDeletion(clientId, reason) {
        await prisma.accountDeletionRequest.create({
            data: {
                clientId,
                reason,
                status: 'PENDING'
            }
        });

        await prisma.notification.create({
            data: {
                clientId: null,
                type: 'DELETION_REQUEST',
                content: `درخواست حذف حساب کاربری جدید از کاربر ${clientId}`
            }
        });

        return true;
    }
}
module.exports = {
    ClientAuthService
};

/*
آها! بذارید دقیقاً توضیح بدم تفاوت این دو مدل رو:
مدل Notification شما (مدل فعلی):
این مدل برای نگهداری محتوای خود نوتیفیکیشن‌هاست
هر رکورد در این جدول یک پیام/نوتیفیکیشن مجزاست
مثال‌های کاربرد:

نمایش نوتیفیکیشن‌ها در پنل کاربری
تاریخچه نوتیفیکیشن‌های ارسال شده
ذخیره وضعیت خوانده شدن پیام‌ها
نگهداری محتوای پیام‌هایی که از طریق FCM ارسال شده‌اند


مدل ClientNotificationSettings (مدل پیشنهادی جدید):
این مدل برای نگهداری تنظیمات و پیکربندی نوتیفیکیشن هر کاربر است
هر کاربر فقط یک رکورد در این جدول دارد
مثال‌های کاربرد:

ذخیره FCM token های کاربر
تنظیمات فعال/غیرفعال کردن انواع نوتیفیکیشن
ذخیره ترجیحات کاربر برای نحوه دریافت نوتیفیکیشن
در واقع، شما به هر دو مدل نیاز دارید:

مثال کاربرد هر دو مدل با هم
async function sendPushNotification(clientId, message) {
    دریافت تنظیمات نوتیفیکیشن کاربر
    const clientSettings = await prisma.clientNotificationSettings.findUnique({
        where: { clientId }
    });

    چک کردن اینکه آیا کاربر push notification رو فعال کرده
    if (!clientSettings.pushNotifications) {
        return;
    }

    ارسال نوتیفیکیشن با FCM
    await firebase.messaging().sendToDevice(clientSettings.deviceTokens, {
        notification: {
            title: message.title,
            body: message.body
        }
    });

    ذخیره نوتیفیکیشن در دیتابیس
    await prisma.notification.create({
        data: {
            clientId,
            type: message.type,
            title: message.title,
            message: message.body,
            status: 'SENT',
            ... سایر فیلدها
        }
    });
}
    */