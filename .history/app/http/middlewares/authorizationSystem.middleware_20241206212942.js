const createError = require("http-errors");
const JWT = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { ACCESS_TOKEN_SECRET_KEY, REFRESH_TOKEN_SECRET_KEY } = require("../../utils/constants");
const { promisify } = require('util');
const verifyAsync = promisify(JWT.verify);
const {createRedisClient} = require("../../utils/initRedis");

// Ensure redisClient is properly initialized
let redisClient;
(async () => {
    redisClient = await createRedisClient();
    
})();

    // ساختن و امضای Access Token
    async function SignAccessToken(Id) {
        try {
            // جستجوی همزمان در هر دو مدل
            const [user, client] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: Id },
                    select: { mobile: true }
                }),
                prisma.client.findUnique({
                    where: { id: Id },
                    select: { mobile: true }
                })
            ]);

            const man = user || client;
            if (!man) throw createError.NotFound('کاربر یافت نشد');

            const payload = {
                mobile: man.mobile
            };
            
            const options = {
                expiresIn: "24h"
            };

            return new Promise((resolve, reject) => {
                JWT.sign(payload, ACCESS_TOKEN_SECRET_KEY, options, (err, token) => {
                    if (err) reject(createError.InternalServerError("خطای سمت سرور"));
                    resolve(token);
                });
            });
        } catch (error) {
            throw error;
        }
    }

    // ساختن و امضای Refresh Token و ذخیره آن در Redis
    async function SignRefreshToken(Id) {
        try {
            // جستجوی همزمان در هر دو مدل
            const [user, client] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: Id },
                    select: { mobile: true }
                }),
                prisma.client.findUnique({
                    where: { id: Id },
                    select: { mobile: true }
                })
            ]);

            const man = user || client;
            if (!man) throw createError.NotFound('کاربر یافت نشد');

            const payload = {
                mobile: man.mobile
            };
            
            const options = {
                expiresIn: "1y"
            };

            return new Promise((resolve, reject) => {
                JWT.sign(payload, REFRESH_TOKEN_SECRET_KEY, options, async (err, token) => {
                    if (err) reject(createError.InternalServerError("خطای سمت سرور"));

                    // ذخیره توکن در Redis با TTL یک سال
                    await redisClient.SETEX(`refreshTokens:${Id}`, 365 * 24 * 60 * 60, token);
                    resolve(token);
                });
            });
        } catch (error) {
            throw error;
        }
    }

    // تأیید Refresh Token
    async function VerifyRefreshToken(token) {
        return new Promise((resolve, reject) => {
            JWT.verify(token, REFRESH_TOKEN_SECRET_KEY, async (err, payload) => {
                if (err) return reject(createError.Unauthorized("وارد حساب کاربری خود شوید"));
                
                try {
                    const { mobile } = payload || {};
                    
                    // جستجوی همزمان در هر دو مدل
                    const [user, client] = await Promise.all([
                        prisma.user.findUnique({
                            where: { mobile },
                            select: { id: true }
                        }),
                        prisma.client.findUnique({
                            where: { mobile },
                            select: { id: true }
                        })
                    ]);

                    const sample = user?.id || client?.id;
                    if (!sample) throw createError.Unauthorized("حساب کاربری یافت نشد");

                    // دریافت توکن از Redis
                    const refreshToken = await redisClient.get(`refreshTokens:${sample}`);
                    if (!refreshToken) throw createError.Unauthorized("ورود موفقیت آمیز نبود");
                    if (token === refreshToken) return resolve(mobile);

                    throw createError.Unauthorized("ورود موفقیت آمیز نبود");
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
    // دریافت و بررسی Access Token
    function getToken(headers) {
        const [bearer, token] = headers?.authorization?.split(" ") || [];
        if (token && ["Bearer", "bearer"].includes(bearer)) return token;
        throw createError.Unauthorized("حساب کاربری شناسایی نشد وارد حساب کاربری خود شوید");
    }

    async function VerifyAccessToken(req, res, next) {
        try {
            const token = getToken(req.headers);
            const payload = await verifyAsync(token, ACCESS_TOKEN_SECRET_KEY);
            const { mobile } = payload || {};

            const user = await prisma.user.findUnique({
                where: { mobile },
                select: {
                    id: true,
                    mobile: true,
                    ownedSupplierStore: {
                        select: {
                            id: true,
                        },
                        },
                        ownedGarage: {
                            select: {
                                id: true,
                            },
                    },
                },
                });

                
            if (!user) {
                const client = await prisma.client.findUnique({
                    where: { mobile },
                    select: {
                        id: true,
                        mobile: true,
                        email: true,
                        name: true,
                        // سایر فیلدهای مورد نیاز
                    },
                });

                if (client) {
                    req.client = client;
                } else {
                    throw createError.Unauthorized("حساب کاربری یافت نشد");
                }
            } else {
                req.user = user;
            }

            next();
        } catch (error) {
            next(error);
        }
    }

module.exports = {
    VerifyAccessToken,
    SignAccessToken,
    SignRefreshToken,
    VerifyRefreshToken,
};
// لانچ اولیه و تستی اپلیکیشن تا مدتی 3 ماه گاراژ ها حساب میشه ولی تا ددلاین مانیتایز شدن
// پروفایلشون قفل نمیشه روزی که تصمیم گرفتیم مانیتایز کنیم اونهایی که 3 ماهشون رد شده قفل میشن
// و اونهایی که هم 3 ماهشون تموم نشده دسترسی دارن همچنان
