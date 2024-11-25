const createHttpError = require("http-errors");
const { RandomNumberGenerator } = require("../../../../utils/functions.js");
const { getOtpSchema, checkOtpSchema } = require("../../../validators/user/auth.schema.js");
const Controller = require("../../controller.js");
const { PrismaClient } = require("@prisma/client");
const crypto = require('crypto');
const winston = require('winston');
const prisma = new PrismaClient();
const redisClient = require("../../../../utils/initRedis.js");
const { SignAccessToken, SignRefreshToken, VerifyRefreshToken } = require("../../../middlewares/authorizationSystem.js.js");

class UserAuthController extends Controller {
    constructor() {
        super();
        // تنظیمات لاگر
        this.logger = winston.createLogger({
            format: winston.format.json(),
            transports: [
                new winston.transports.File({ filename: 'error.log', level: 'error' }),
                new winston.transports.File({ filename: 'security.log', level: 'warn' }),
                new winston.transports.File({ filename: 'combined.log' })
            ]
        });
    }

    // تولید HMAC برای توکن‌ها
    generateHMAC(data) {
        const secret = process.env.HMAC_SECRET;
        return crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
    }

    
    // بررسی فعالیت‌های مشکوک
    async checkSuspiciousActivity(mobile, ip) {
        const suspiciousKey = `suspicious:${mobile}:${ip}`;
        const attempts = await redisClient.incr(suspiciousKey);
        await redisClient.expire(suspiciousKey, 3600); // یک ساعت

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

    async getOtp(req, res, next) {
        try {
            await getOtpSchema.validateAsync(req.body);
            const { mobile } = req.body;
            const ip = req.ip;

            // بررسی محدودیت تعداد درخواست OTP
            const otpRequestKey = `otp_requests:${mobile}`;
            const requestsCount = await redisClient.incr(otpRequestKey);
            
            if (requestsCount === 1) {
                await redisClient.expire(otpRequestKey, 300); // 5 دقیقه محدودیت
            }

            if (requestsCount > 5) {
                this.logger.warn('OTP Request Limit Exceeded', { mobile, ip });
                throw createHttpError.TooManyRequests('تعداد درخواست‌های کد تایید بیش از حد مجاز است');
            }

            // بررسی فعالیت مشکوک
            const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
            if (isSuspicious) {
                throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
            }

            const code = RandomNumberGenerator();
            const result = await this.saveOtpToRedis(mobile, code);
            
            // لاگ کردن درخواست OTP
            this.logger.info('OTP Requested', {
                mobile,
                ip,
                timestamp: new Date()
            });

            if (!result) throw createHttpError.Unauthorized("ورود شما انجام نشد");

            return res.status(200).send({
                data: {
                    statusCode: 200,
                    message: "کد اعتبار سنجی با موفقیت ارسال شد",
                    code,
                    mobile
                }
            });
        } catch (error) {
            next(createHttpError.BadRequest(error.message));
        }
    }

    async checkOtp(req, res, next) {
        try {
            await checkOtpSchema.validateAsync(req.body);
            const { mobile, code } = req.body;
            const ip = req.ip;

            // بررسی فعالیت مشکوک
            const isSuspicious = await this.checkSuspiciousActivity(mobile, ip);
            if (isSuspicious) {
                throw createHttpError.TooManyRequests('فعالیت مشکوک شناسایی شد');
            }

            const storedOtp = await redisClient.get(`otp:${mobile}`);
            if (!storedOtp) throw createHttpError.Unauthorized("کد منقضی شده یا یافت نشد");
            if (storedOtp !== code) {
                // لاگ تلاش ناموفق
                this.logger.warn('Failed OTP Attempt', {
                    mobile,
                    ip,
                    timestamp: new Date()
                });
                throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");
            }

            let user = await this.getUserFromCache(mobile);
            if (!user) {
                // بهینه‌سازی کوئری با select
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
                    // Batch processing برای ایجاد کاربر و پروفایل
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

                // کش پیشرفته با TTL متغیر
                const cacheTime = user.isSystemAdmin ? 1800 : 3600; // 30 دقیقه برای ادمین، 1 ساعت برای کاربران عادی
                await this.cacheUserWithTTL(user, cacheTime);
            }

            // ایجاد توکن با HMAC
            const tokenData = {
                userId: user.id,
                timestamp: Date.now()
            };
            const hmac = this.generateHMAC(JSON.stringify(tokenData));
            const accessToken = await SignAccessToken(user.id, hmac);
            const refreshToken = await SignRefreshToken(user.id, hmac);

            // لاگ ورود موفق
            this.logger.info('Successful Login', {
                userId: user.id,
                mobile,
                ip,
                timestamp: new Date()
            });

            // حذف OTP و کلیدهای مرتبط
            await redisClient.del(`otp:${mobile}`);
            await redisClient.del(`otp_requests:${mobile}`);
            
            return res.json({
                data: {
                    accessToken,
                    refreshToken
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            
            // بررسی اینکه آیا توکن در لیست سیاه هست یا نه
            const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
            if (isBlacklisted) throw createHttpError.Unauthorized("توکن معتبر نمی‌باشد.");

            const mobile = await VerifyRefreshToken(refreshToken);

            // بررسی کش برای کاربر
            let user = await this.getUserFromCache(mobile);
            if (!user) {
                user = await prisma.user.findUnique({
                    where: {
                        mobile: mobile
                    }
                });
                if (user) {
                    await this.cacheUser(user);
                }
            }
            
            const accessToken = await SignAccessToken(user.id);
            const newRefreshToken = await SignRefreshToken(user.id);
            
            return res.json({
                data: {
                    accessToken,
                    refreshToken: newRefreshToken
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) throw createHttpError.BadRequest("توکن ورود لازم است");

            // اضافه کردن توکن به لیست سیاه
            await this.addToBlacklist(refreshToken);

            return res.status(200).json({
                message: "خروج با موفقیت انجام شد"
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر تکمیل پروفایل
    async completeProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                first_name,
                last_name,
                nationalIdNumber,
                province,
                city,
                bussinesRole,
                expertices
            } = req.body;

            // بررسی اینکه آیا پروفایل قبلاً تکمیل شده
            const existingProfile = await prisma.userProfile.findUnique({
                where: { userId }
            });

            if (existingProfile) {
                throw createHttpError.BadRequest("پروفایل قبلاً تکمیل شده است");
            }

            // ایجاد پروفایل‌های مورد نیاز
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

            // آپدیت کش
            await this.cacheUser({
                ...req.user,
                userProfile,
                businessProfile
            });

            return res.status(201).json({
                data: {
                    userProfile,
                    businessProfile
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر تغییر شماره موبایل
    async updateMobile(req, res, next) {
        try {
            const userId = req.user.id;
            const { newMobile, code } = req.body;

            // بررسی OTP
            const storedOtp = await redisClient.get(`otp:${newMobile}`);
            if (!storedOtp || storedOtp !== code) {
                throw createHttpError.Unauthorized("کد تایید نامعتبر است");
            }

            // بررسی تکراری نبودن شماره جدید
            const existingUser = await prisma.user.findUnique({
                where: { mobile: newMobile }
            });

            if (existingUser) {
                throw createHttpError.Conflict("این شماره موبایل قبلاً ثبت شده است");
            }

            // آپدیت شماره موبایل
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { mobile: newMobile }
            });

            // آپدیت کش و حذف OTP
            await this.cacheUser(updatedUser);
            await redisClient.del(`otp:${newMobile}`);

            return res.json({
                data: {
                    message: "شماره موبایل با موفقیت تغییر کرد",
                    user: updatedUser
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر غیرفعال‌سازی حساب کاربری
    async deactivateAccount(req, res, next) {
        try {
            const userId = req.user.id;
            const { password } = req.body;

            const user = await prisma.user.update({
                where: { id: userId },
                data: { 
                    isActive: false,
                    deactivatedAt: new Date()
                }
            });

            // حذف همه توکن‌های کاربر
            await this.invalidateAllUserTokens(userId);
            
            // حذف از کش
            await redisClient.del(`user:${user.mobile}`);

            return res.json({
                message: "حساب کاربری با موفقیت غیرفعال شد"
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر بازیابی حساب کاربری
    async reactivateAccount(req, res, next) {
        try {
            const { mobile, code } = req.body;

            // بررسی OTP
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

            // ایجاد توکن‌های جدید
            const accessToken = await SignAccessToken(user.id);
            const refreshToken = await SignRefreshToken(user.id);

            // آپدیت کش
            await this.cacheUser(updatedUser);

            return res.json({
                data: {
                    message: "حساب کاربری با موفقیت فعال شد",
                    accessToken,
                    refreshToken
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // متد کمکی برای باطل کردن همه توکن‌های کاربر
    async invalidateAllUserTokens(userId) {
        try {
            const pattern = `user_tokens:${userId}:*`;
            const keys = await redisClient.keys(pattern);
            
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            console.error("Error invalidating user tokens:", error);
        }
    }

    // کش پیشرفته با TTL متغیر
    async cacheUserWithTTL(user, ttl) {
        try {
            const cacheKey = `user:${user.mobile}`;
            const userData = {
                ...user,
                cached_at: Date.now()
            };
            await redisClient.SETEX(cacheKey, ttl, JSON.stringify(userData));

            // ذخیره کلید کش در یک ست برای مدیریت بهتر
            await redisClient.SADD('active_user_caches', cacheKey);
        } catch (error) {
            this.logger.error('Cache Error', { error: error.message });
        }
    }

    // پاکسازی دوره‌ای کش‌های منقضی
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

    // ذخیره OTP در Redis با TTL
    async saveOtpToRedis(mobile, otp) {
        try {
            const ttl = 120; // انقضا OTP در ثانیه (2 دقیقه)
            const otpStr = String(otp);
            await redisClient.SETEX(`otp:${mobile}`, ttl, otpStr);
            return true;
        } catch (error) {
            console.error("Error saving OTP to Redis:", error);
            return false;
        }
    }

    // اضافه کردن توکن به لیست سیاه در Redis
    async addToBlacklist(token) {
        try {
            const ttl = 365 * 24 * 60 * 60; // 1 سال (یا هر زمان دیگری که توکن معتبر است)
            await redisClient.SETEX(`blacklist:${token}`, ttl, true);
        } catch (error) {
            console.error("Error adding token to blacklist:", error);
        }
    }

    // بررسی اینکه آیا توکن در لیست سیاه است یا خیر
    async isTokenBlacklisted(token) {
        try {
            const result = await redisClient.get(`blacklist:${token}`);
            return !!result; // اگر نتیجه وجود داشته باشد یعنی توکن در لیست سیاه است
        } catch (error) {
            console.error("Error checking token in blacklist:", error);
            return false;
        }
    }

    // کش کردن اطلاعات کاربر
    async cacheUser(user) {
        try {
            const ttl = 3600; // 1 ساعت
            await redisClient.SETEX(`user:${user.mobile}`, ttl, JSON.stringify(user));
        } catch (error) {
            console.error("Error caching user data:", error);
        }
    }

    // دریافت اطلاعات کاربر از کش
    async getUserFromCache(mobile) {
        try {
            const cachedUser = await redisClient.get(`user:${mobile}`);
            return cachedUser ? JSON.parse(cachedUser) : null;
        } catch (error) {
            console.error("Error retrieving user from cache:", error);
            return null;
        }
    }

    // کنترل نرخ درخواست‌ها (Rate Limiting)
    async checkRateLimit(mobile) {
        try {
            const currentCount = await redisClient.incr(`rate_limit:${mobile}`);
            if (currentCount === 1) {
                // تنظیم TTL برای کلید نرخ درخواست‌ها
                await redisClient.expire(`rate_limit:${mobile}`, 60); // یک دقیقه
            }
            return currentCount > 5; // حداکثر 5 درخواست در دقیقه
        } catch (error) {
            console.error("Error checking rate limit:", error);
            return false;
        }
    }

     // هندلر آپدیت پروفایل تجاری
     async updateBusinessProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                mechanicPercentage,
                apprenticePercentage,
                bussinesRole,
                expertices
            } = req.body;

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

            // آپدیت کش
            const user = await this.getUserFromCache(req.user.mobile);
            if (user) {
                user.businessProfile = businessProfile;
                await this.cacheUser(user);
            }

            return res.json({
                data: {
                    message: "پروفایل تجاری با موفقیت بروزرسانی شد",
                    businessProfile
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر آپدیت پروفایل اجتماعی
    async updateSocialProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const { socialLinks } = req.body;

            const socialProfile = await prisma.socialProfile.upsert({
                where: { userId },
                update: { socialLinks },
                create: {
                    userId,
                    socialLinks
                }
            });

            return res.json({
                data: {
                    message: "پروفایل اجتماعی با موفقیت بروزرسانی شد",
                    socialProfile
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر بروزرسانی اطلاعات مکانی
    async updateLocationInfo(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                province,
                city,
                location,
                garageLat_Lng,
                supplierStoreLat_Lng
            } = req.body;

            const userProfile = await prisma.userProfile.update({
                where: { userId },
                data: {
                    province,
                    city,
                    location,
                    garageLat_Lng,
                    supplierStoreLat_Lng
                }
            });

            return res.json({
                data: {
                    message: "اطلاعات مکانی با موفقیت بروزرسانی شد",
                    userProfile
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر بروزرسانی اطلاعات بانکی و هویتی
    async updateFinancialInfo(req, res, next) {
        try {
            const userId = req.user.id;
            const { nationalIdNumber, bankAccountNumber } = req.body;

            // بررسی تکراری نبودن اطلاعات
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

            const userProfile = await prisma.userProfile.update({
                where: { userId },
                data: {
                    nationalIdNumber,
                    bankAccountNumber
                }
            });

            return res.json({
                data: {
                    message: "اطلاعات مالی و هویتی با موفقیت بروزرسانی شد",
                    userProfile
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر تغییر وضعیت کاربر توسط ادمین
    async updateUserStatus(req, res, next) {
        try {
            const adminId = req.user.id;
            const { userId, status, reason } = req.body;

            // بررسی دسترسی ادمین
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

            // ثبت لاگ تغییر وضعیت
            await prisma.userStatusLog.create({
                data: {
                    userId,
                    adminId,
                    oldStatus: user.status,
                    newStatus: status,
                    reason
                }
            });

            // در صورت مسدود شدن، همه توکن‌ها باطل شوند
            if (status === 'SUSPENDED') {
                await this.invalidateAllUserTokens(userId);
            }

            return res.json({
                message: "وضعیت کاربر با موفقیت تغییر کرد",
                user
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر آپلود و بروزرسانی تصاویر پروفایل
    async updateProfileMedia(req, res, next) {
        try {
            const userId = req.user.id;
            const { profileImageUrl, coverImageUrl } = req.body;

            const userProfile = await prisma.userProfile.update({
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

            return res.json({
                data: {
                    message: "تصاویر پروفایل با موفقیت بروزرسانی شد",
                    userProfile
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر مدیریت نقش‌های کاربری
    async updateUserRoles(req, res, next) {
        try {
            const adminId = req.user.id;
            const { userId, roles } = req.body;

            // بررسی دسترسی ادمین
            const admin = await prisma.user.findUnique({
                where: { id: adminId }
            });

            if (!admin.isSystemAdmin) {
                throw createHttpError.Forbidden("شما دسترسی لازم را ندارید");
            }

            // حذف نقش‌های قبلی و اضافه کردن نقش‌های جدید
            await prisma.userRole.deleteMany({
                where: { userId }
            });

            const userRoles = await prisma.userRole.createMany({
                data: roles.map(role => ({
                    userId,
                    role
                }))
            });

            return res.json({
                message: "نقش‌های کاربری با موفقیت بروزرسانی شد",
                userRoles
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر بازیابی رمز عبور با OTP
    async resetPassword(req, res, next) {
        try {
            const { mobile, code, newPassword } = req.body;

            // بررسی OTP
            const storedOtp = await redisClient.get(`otp:${mobile}`);
            if (!storedOtp || storedOtp !== code) {
                throw createHttpError.Unauthorized("کد تایید نامعتبر است");
            }

            // هش کردن رمز عبور جدید
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const user = await prisma.user.update({
                where: { mobile },
                data: {
                    password: hashedPassword,
                    passwordResetAt: new Date()
                }
            });

            // باطل کردن همه توکن‌های قبلی
            await this.invalidateAllUserTokens(user.id);

            return res.json({
                message: "رمز عبور با موفقیت بازیابی شد"
            });
        } catch (error) {
            next(error);
        }
    }

    // هندلر درخواست حذف حساب کاربری
    async requestAccountDeletion(req, res, next) {
        try {
            const userId = req.user.id;
            const { reason } = req.body;

            // ایجاد درخواست حذف
            await prisma.accountDeletionRequest.create({
                data: {
                    userId,
                    reason,
                    status: 'PENDING'
                }
            });

            // ارسال اعلان به ادمین
            await prisma.notification.create({
                data: {
                    userId: null, // admin notification
                    type: 'DELETION_REQUEST',
                    content: `درخواست حذف حساب کاربری جدید از کاربر ${userId}`
                }
            });

            return res.json({
                message: "درخواست حذف حساب کاربری با موفقیت ثبت شد"
            });
        } catch (error) {
            next(error);
        }
    }
}


module.exports = {
    UserAuthController: new UserAuthController()
};
