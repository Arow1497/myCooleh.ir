const { default: axios } = require("axios");
const createHttpError = require("http-errors");
const moment = require("moment-jalali");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { PrismaClient } = require("@prisma/client");
const Joi = require("joi"); // تغییر به Joi برای validation
const redis = require("redis");
const Controller = require("../controller");

// ایجاد نمونه Prisma
const prisma = new PrismaClient();

// ایجاد کلاینت Redis
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
});

// Schema validation برای پرداخت با Joi
const PaymentSchema = Joi.object({
    amount: Joi.number().min(1000).max(50000000).required(),
    description: Joi.string().min(5).max(255).required(),
    email: Joi.string().email().optional(),
    mobile: Joi.string().pattern(/^09[0-9]{9}$/).required()
});

class PaymentController extends Controller {
    // تولید شماره فاکتور یکتا
    #invoiceNumberGenerator() {
        return `INV-${moment().format('YYYYMMDDHHmmssSSS')}-${Math.floor(Math.random() * 90000) + 10000}`;
    }

    // دریافت سبد خرید کاربر با کش
    async #getBasketOfUser(userId) {
        const cacheKey = `basket:${userId}`;
        
        // بررسی کش
        const cachedBasket = await redisClient.get(cacheKey);
        if (cachedBasket) return JSON.parse(cachedBasket);

        // دریافت از دیتابیس
        const basket = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                basket: true,
                courses: true,
                products: true
            }
        });

        // ذخیره در کش
        await redisClient.setEx(cacheKey, 300, JSON.stringify(basket)); // 5 دقیقه
        return basket;
    }
///////////////////////////////////////////////////////////

    async PaymentGateway(req, res, next) {
        try {
            const user = req.user;
            
            // Validation ورودی‌ها با Joi
            const { error, value: validatedData } = PaymentSchema.validate({
                amount: req.body.amount,
                description: req.body.description || "پرداخت سفارش",
                email: user.email,
                mobile: user.mobile
            }, { abortEarly: false });

            if (error) {
                throw createHttpError.BadRequest("اطلاعات ورودی نامعتبر است");
            }

            // بررسی سبد خرید
            const basket = await this.#getBasketOfUser(user.id);
            if (!basket || (!basket.courses.length && !basket.products.length)) {
                throw new createHttpError.BadRequest("سبد خرید شما خالی است");
            }

            // تنظیمات درگاه زرین‌پال
            const zarinpalConfig = {
                request_url: process.env.ZARINPAL_REQUEST_URL,
                gateway_url: process.env.ZARINPAL_GATEWAY_URL,
                merchant_id: process.env.ZARINPAL_MERCHANT_ID
            };

            // درخواست به زرین‌پال
            const paymentRequest = await axios.post(zarinpalConfig.request_url, {
                merchant_id: zarinpalConfig.merchant_id,
                amount: validatedData.amount,
                description: validatedData.description,
                metadata: {
                    email: validatedData.email,
                    mobile: validatedData.mobile
                },
                callback_url: process.env.PAYMENT_CALLBACK_URL
            });

            const { authority, code } = paymentRequest.data.data;

            // ثبت تراکنش در دیتابیس
            await prisma.payment.create({
                data: {
                    invoiceNumber: this.#invoiceNumberGenerator(),
                    paymentDate: new Date(),
                    amount: validatedData.amount,
                    userId: user.id,
                    description: validatedData.description,
                    authority,
                    verify: false,
                    basketData: basket
                }
            });

            if (code === 100 && authority) {
                // لاگ تراکنش موفق
                console.info(`Payment initiated: ${authority} for user: ${user.id}`);
                
                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    data: {
                        code,
                        basket,
                        gatewayURL: `${zarinpalConfig.gateway_url}/${authority}`
                    }
                });
            }

            throw createHttpError.BadRequest("اتصال به درگاه پرداخت با خطا مواجه شد");

        } catch (error) {
            // لاگ خطا
            console.error("Payment Gateway Error:", error);
            next(error);
        }
    }

    async verifyPayment(req, res, next) {
        const session = await prisma.$beginTransaction();
        
        try {
            const { Authority: authority } = req.query;
            if (!authority) {
                throw createHttpError.BadRequest("شناسه پرداخت نامعتبر است");
            }

            // یافتن تراکنش
            const payment = await prisma.payment.findUnique({
                where: { authority },
                include: { user: true }
            });

            if (!payment) {
                throw createHttpError.NotFound("تراکنش یافت نشد");
            }

            if (payment.verify) {
                throw createHttpError.BadRequest("این تراکنش قبلاً تایید شده است");
            }

            // تایید پرداخت با زرین‌پال
            const verifyResult = await axios.post(process.env.ZARINPAL_VERIFY_URL, {
                authority,
                amount: payment.amount,
                merchant_id: process.env.ZARINPAL_MERCHANT_ID
            });

            const { code, ref_id, card_hash } = verifyResult.data.data;

            if (code === 100) {
                // بروزرسانی تراکنش
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        verify: true,
                        refId: ref_id,
                        cardHash: card_hash,
                        verifiedAt: new Date()
                    }
                });

                // بروزرسانی سبد خرید کاربر
                const basketData = payment.basketData;
                await prisma.user.update({
                    where: { id: payment.userId },
                    data: {
                        courses: {
                            connect: basketData.courses.map(id => ({ id }))
                        },
                        products: {
                            connect: basketData.products.map(id => ({ id }))
                        },
                        basket: {
                            courses: [],
                            products: []
                        }
                    }
                });

                // پاک کردن کش
                await redisClient.del(`basket:${payment.userId}`);

                await session.commitTransaction();

                // ارسال نوتیفیکیشن به کاربر
                this.sendPaymentSuccessNotification(payment.userId, payment.amount);

                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    data: {
                        message: "پرداخت با موفقیت انجام شد",
                        referenceId: ref_id
                    }
                });
            }

            throw createHttpError.BadRequest("پرداخت تایید نشد. در صورت کسر وجه، مبلغ طی ۷۲ ساعت به حساب شما باز خواهد گشت");

        } catch (error) {
            await session.rollbackTransaction();
            console.error("Payment Verification Error:", error);
            next(error);
        } finally {
            await session.release();
        }
    }

    // ارسال نوتیفیکیشن موفقیت پرداخت
    async sendPaymentSuccessNotification(userId, amount) {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    type: 'PAYMENT_SUCCESS',
                    title: 'پرداخت موفق',
                    message: `پرداخت شما به مبلغ ${amount} تومان با موفقیت انجام شد`,
                    read: false
                }
            });
        } catch (error) {
            console.error('Notification Error:', error);
        }
    }
}

module.exports = {
    PaymentController: new PaymentController()
};