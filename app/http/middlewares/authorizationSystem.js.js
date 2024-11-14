const createError = require("http-errors");
const JWT = require("jsonwebtoken");
const { UsersModel } = require("../../models/Main/user");
const { ClientsModel } = require("../../models/Garages/clients");
const redisClient = require("../../utils/initRedis");
const { ACCESS_TOKEN_SECRET_KEY, REFRESH_TOKEN_SECRET_KEY } = require("../../utils/constants");
const { SubscriptionsModel } = require("../../models/Main/subscription");

// ساختن و امضای Access Token
function SignAccessToken(Id) {
    return new Promise(async (resolve, reject) => {
        let user = await UsersModel?.findById(Id);
        let client = await ClientsModel?.findById(Id);
        // console.log(Id);
        let man;
        if (user)  man = user; 
        if (client)  man = client; 

        const payload = {
            mobile: man.mobile
        };
        const options = {
            expiresIn: "24h"
        };
        JWT.sign(payload, ACCESS_TOKEN_SECRET_KEY, options, (err, token) => {
            if (err) reject(createError.InternalServerError("خطای سمت سرور"));
            resolve(token);
        });
    });
}

// ساختن و امضای Refresh Token و ذخیره آن در Redis
function SignRefreshToken(Id) {
    return new Promise(async (resolve, reject) => {
        let user = await UsersModel?.findById(Id);
        let client = await ClientsModel?.findById(Id);
        let man;
        if (user) man = user; 
        if (client) man = client; 

        const mobile = man.mobile;
        const payload = {
            mobile: man.mobile
        };
        const options = {
            expiresIn: "1y"
        };
        JWT.sign(payload, REFRESH_TOKEN_SECRET_KEY, options, async (err, token) => {
            if (err) reject(createError.InternalServerError("خطای سمت سرور"));

            // ذخیره توکن در Redis با TTL یک سال (365 روز)
            await redisClient.SETEX(`refreshTokens:${Id.toString()}`, 365 * 24 * 60 * 60, token);
            resolve(token);
        });
    });           
}

// تأیید Refresh Token
function VerifyRefreshToken(token) {
    return new Promise((resolve, reject) => {
        JWT.verify(token, REFRESH_TOKEN_SECRET_KEY, async (err, payload) => {
            if (err) return reject(createError.Unauthorized("وارد حساب کاربری خود شوید"));
           
            let sample;
            const { mobile } = payload || {};
            const user = await UsersModel.findOne({ mobile }, { password: 0, otp: 0 });
            const client = !user ? await ClientsModel.findOne({ mobile }, { password: 0, otp: 0 }) : null;
            user ? sample = user._id  : (client ?  sample = client._id  : next(createError.Unauthorized("حساب کاربری یافت نشد")));

            // دریافت توکن از Redis
            const refreshToken = await redisClient.get(`refreshTokens:${String(sample)}`);
            if (!refreshToken) reject(createError.Unauthorized("ورود موفقیت آمیز نبود"));
            if (token === refreshToken) return resolve(mobile);

            reject(createError.Unauthorized("ورود موفقیت آمیز نبود"));
        });
    });                     
}

// دریافت و بررسی Access Token
function getToken(headers) {
    const [bearer, token] = headers?.authorization?.split(" ") || [];
    if (token && ["Bearer", "bearer"].includes(bearer)) return token;
    throw createError.Unauthorized("حساب کاربری شناسایی نشد وارد حساب کاربری خود شوید");
}

// تأیید Access Token
function VerifyAccessToken(req, res, next) {
    try {
        const token = getToken(req.headers);
        JWT.verify(token, ACCESS_TOKEN_SECRET_KEY, async (err, payload) => {
            try {
                if (err) throw createError.Unauthorized("احراز هویت ناموفق بود دوباره وارد شوید");

                const { mobile } = payload || {};
                const user = await UsersModel.findOne({ mobile }, { password: 0, otp: 0 });
                const client = !user ? await ClientsModel.findOne({ mobile }, { password: 0, otp: 0 }) : null;

                user ? req.user = user : (client ? req.client = client : next(createError.Unauthorized("حساب کاربری یافت نشد")));

                return next();
            } catch (error) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
}

async function checkSubscription(req, res, next){
 const userID = req.user._id;
 const subscription = await SubscriptionsModel.findOne({user: userID, isActive: true})
 .sort({subscriptionEndDate: -1});
 if(subscription){
    const now = new Date();
    if(subscription.subscriptionEndDate > now){
        return next();
    }else{
        subscription.isActive = false;
        await subscription.save();
        return next(createError.Unauthorized("با عرض پوزش اشتراک شما به پایان رسیده برای خرید اشتراک اقدام کنید"))
    }
 }
} // لانچ اولیه و تستی اپلیکیشن تا مدتی 3 ماه گاراژ ها حساب میشه ولی تا ددلاین مانیتایز شدن
// پروفایلشون قفل نمیشه روزی که تصمیم گرفتیم مانیتایز کنیم اونهایی که 3 ماهشون رد شده قفل میشن
// و اونهایی که هم 3 ماهشون تموم نشده دسترسی دارن همچنان




module.exports = {
    VerifyAccessToken,
    SignAccessToken,
    SignRefreshToken,
    VerifyRefreshToken,
    checkSubscription,
};
