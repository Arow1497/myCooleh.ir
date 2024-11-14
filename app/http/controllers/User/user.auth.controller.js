const createHttpError = require("http-errors");
const { RandomNumberGenerator } = require("../../../utils/functions");
const { getOtpSchema, checkOtpSchema } = require("../../../http/validators/user/auth.schema");
const Controller = require("../../controllers/controller");
const { UsersModel } = require("../../../models/Main/user");
const redisClient = require("../../../utils/initRedis.js");
const { SignAccessToken, SignRefreshToken, VerifyRefreshToken } = require("../../middlewares/authorizationSystem.js");

class UserAuthController extends Controller {
    
    async getOtp(req, res, next) {
        try {
            await getOtpSchema.validateAsync(req.body);
            const { mobile } = req.body;
            const code = RandomNumberGenerator();
            
            // ذخیره OTP در Redis
            const result = await this.saveOtpToRedis(mobile, code);
            if (!result) throw createHttpError.Unauthorized("ورود شما انجام نشد");
            
            return res.status(200).send({
                data: {
                    statusCode: 200,
                    message: "کد اعتبار سنجی با موفقیت ارسال شد",
                    code, // فقط برای تست، در حالت عملی نباید به کاربر نمایش داده شود
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
            
            // بررسی OTP از Redis
            const storedOtp = await redisClient.get(`otp:${mobile}`);
            if (!storedOtp) throw createHttpError.Unauthorized("کد منقضی شده یا یافت نشد");
            if (storedOtp !== code) throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");

            // بررسی کش برای کاربر
            let user = await this.getUserFromCache(mobile);
            if (!user) {
                // بررسی وجود کاربر در دیتابیس
                user = await UsersModel.findOne({ mobile });

                if (!user) {
                    // اگر کاربر وجود ندارد، آن را ایجاد کنید
                    user = await UsersModel.create({ mobile });
                }

                // کش کردن اطلاعات کاربر
                await this.cacheUser(user);
            }

            // ایجاد Access Token و Refresh Token
            const accessToken = await SignAccessToken(user._id);
            const refreshToken = await SignRefreshToken(user._id);

            // حذف OTP پس از استفاده موفق
            await redisClient.del(`otp:${mobile}`);
            
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
                user = await UsersModel.findOne({ mobile });
                if (user) {
                    await this.cacheUser(user);
                }
            }
            const accessToken = await SignAccessToken(user._id);
            const newRefreshToken = await SignRefreshToken(user._id);
            
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
}


module.exports = {
    UserAuthController: new UserAuthController()
};
