const createHttpError = require("http-errors");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { SignAccessToken, SignRefreshToken, VerifyRefreshToken } = require("../../middlewares/authorizationSystem.js.js");
const Controller = require("../controller.js");
const redisClient = require("../../../utils/initRedis.js");
const { getOtpSchema, checkOtpSchema } = require("../../validators/user/auth.schema.js");
const { RandomNumberGenerator } = require("../../../utils/functions.js");
const { ROLES } = require("../../../utils/constants.js");

class ClientAuthController extends Controller {

    async clientGetOtp(req, res, next) {
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

    async clientCheckOtp(req, res, next) {
        try {
            await checkOtpSchema.validateAsync(req.body);
            const { mobile, code } = req.body;
            
            // بررسی OTP از Redis
            const storedOtp = await redisClient.get(`otp:${mobile}`);
            if (!storedOtp) throw createHttpError.Unauthorized("کد منقضی شده یا یافت نشد");
            if (storedOtp !== code) throw createHttpError.Unauthorized("کد ارسال شده صحیح نمی‌باشد");

            // بررسی کش برای کاربر
            let client = await this.getClientFromCache(mobile);
            if (!client) {
                // بررسی وجود کاربر در دیتابیس
                client = await ClientsModel.findOne({ mobile });

                if (!client) {
                    // اگر کاربر وجود ندارد، آن را ایجاد کنید
                    client = await ClientsModel.create({ mobile,
                    Role: ROLES.CLIENT });
                }

                // کش کردن اطلاعات کاربر
                await this.cacheClient(client);
            }

            // ایجاد Access Token و Refresh Token
            const accessToken = await SignAccessToken(client._id);
            const refreshToken = await SignRefreshToken(client._id);

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

    async clientRefreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            
            // بررسی اینکه آیا توکن در لیست سیاه هست یا نه
            const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
            if (isBlacklisted) throw createHttpError.Unauthorized("توکن معتبر نمی‌باشد.");

            const mobile = await VerifyRefreshToken(refreshToken);

            // بررسی کش برای کاربر
            let client = await this.getClientFromCache(mobile);
            if (!client) {
                client = await ClientsModel.findOne({ mobile });
                if (client) {
                    await this.cacheClient(client);
                }
            }
            const accessToken = await SignAccessToken(client._id);
            const newRefreshToken = await SignRefreshToken(client._id);
            
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
    async cacheClient(client) {
        try {
            const ttl = 3600; // 1 ساعت
            await redisClient.SETEX(`client:${client.mobile}`, ttl, JSON.stringify(client));
        } catch (error) {
            console.error("Error caching client data:", error);
        }
    }

    // دریافت اطلاعات کاربر از کش
    async getClientFromCache(mobile) {
        try {
            const cachedClient = await redisClient.get(`client:${mobile}`);
            return cachedClient ? JSON.parse(cachedClient) : null;
        } catch (error) {
            console.error("Error retrieving client from cache:", error);
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
    ClientAuthController: new ClientAuthController()
};
