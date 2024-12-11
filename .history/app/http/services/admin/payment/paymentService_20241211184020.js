// getAllTransactions
// getListOfSubscriptionPayments

const createHttpError = require('http-errors');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { StatusCodes } = require('http-status-codes');
const ZarinPal = require('zarinpal-checkout');
const zarinpal = ZarinPal.create('your-merchant-id', true); // true for sandbox mode

class PaymentController extends Controller {
    #convertToRials(amountInTomans) {
        return parseInt(amountInTomans) * 10;
    }

    async createPayment(req, res, next) {
        try {
            const { amount, description, customerId, type = 'SUBSCRIPTION' } = req.body;
            
            if (!amount || !description || !customerId) {
                throw createHttpError.BadRequest("مقادیر ورودی نامعتبر است");
            }

            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                include: {
                    user: true,
                }
            });

            if (!customer) {
                throw createHttpError.NotFound("مشتری مورد نظر یافت نشد");
            }

            // Create payment record
            const payment = await prisma.payment.create({
                data: {
                    customerId,
                    amount: amount.toString(),
                    description,
                    type: 'CREDIT_CARD',
                    basketData: req.body, // Store complete payment request data
                }
            });

            // Initialize Zarinpal payment
            const amountInRials = this.#convertToRials(amount);
            const paymentUrl = `${process.env.APP_URL}/payments/verify`;
            
            const response = await zarinpal.PaymentRequest({
                Amount: amountInRials,
                CallbackURL: paymentUrl,
                Description: description,
                Email: customer.user.email,
                Mobile: customer.billingMobile || customer.user.mobile
            });

            if (response.status === 100) {
                // Update payment with authority
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { authority: response.authority }
                });

                return res.status(StatusCodes.OK).json({
                    statusCode: StatusCodes.OK,
                    data: {
                        paymentUrl: response.url,
                        authority: response.authority,
                        paymentId: payment.id
                    }
                });
            }

            throw createHttpError.ServiceUnavailable("در حال حاضر امکان اتصال به درگاه پرداخت وجود ندارد");

        } catch (error) {
            next(error);
        }
    }

    async verifyPayment(req, res, next) {
        try {
            const { Authority, Status } = req.query;

            if (!Authority || !Status) {
                throw createHttpError.BadRequest("اطلاعات تایید پرداخت ناقص است");
            }

            const payment = await prisma.payment.findUnique({
                where: { authority: Authority },
                include: {
                    customer: true
                }
            });

            if (!payment) {
                throw createHttpError.NotFound("تراکنش مورد نظر یافت نشد");
            }

            if (payment.verify) {
                throw createHttpError.BadRequest("این تراکنش قبلا تایید شده است");
            }

            if (Status === 'OK') {
                const verificationResponse = await zarinpal.PaymentVerification({
                    Amount: this.#convertToRials(payment.amount),
                    Authority,
                });

                if (verificationResponse.status === 100) {
                    // Update payment record
                    const updatedPayment = await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            verify: true,
                            refID: verificationResponse.RefID,
                            verifiedAt: new Date(),
                            cardHash: verificationResponse.cardHash
                        }
                    });

                    // Create billing record
                    await prisma.billingRecord.create({
                        data: {
                            subscriptionId: payment.basketData.subscriptionId,
                            amount: parseFloat(payment.amount),
                            billingDate: new Date(),
                            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                            status: 'SUCCESSFUL',
                            paymentMethodId: payment.id
                        }
                    });

                    return res.status(StatusCodes.OK).json({
                        statusCode: StatusCodes.OK,
                        data: {
                            message: "پرداخت با موفقیت انجام شد",
                            referenceId: verificationResponse.RefID,
                            paymentDetails: updatedPayment
                        }
                    });
                }
            }

            throw createHttpError.PaymentRequired("پرداخت ناموفق بود");

        } catch (error) {
            next(error);
        }
    }

    async getPaymentHistory(req, res, next) {
        try {
            const { customerId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const skip = (page - 1) * limit;

            const payments = await prisma.payment.findMany({
                where: {
                    customerId,
                    verify: true
                },
                orderBy: {
                    paymentDate: 'desc'
                },
                skip,
                take: parseInt(limit),
                include: {
                    billingRecords: true
                }
            });

            const total = await prisma.payment.count({
                where: {
                    customerId,
                    verify: true
                }
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    payments,
                    pagination: {
                        total,
                        page: parseInt(page),
                        pageSize: parseInt(limit),
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async getPaymentDetails(req, res, next) {
        try {
            const { paymentId } = req.params;

            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    customer: true,
                    billingRecords: true
                }
            });

            if (!payment) {
                throw createHttpError.NotFound("تراکنش مورد نظر یافت نشد");
            }

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    payment
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async createRefund(req, res, next) {
        try {
            const { paymentId } = req.params;
            const { reason } = req.body;

            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    billingRecords: true
                }
            });

            if (!payment) {
                throw createHttpError.NotFound("تراکنش مورد نظر یافت نشد");
            }

            if (!payment.verify) {
                throw createHttpError.BadRequest("این تراکنش تایید نشده است");
            }

            // Update billing record status
            await prisma.billingRecord.update({
                where: { id: payment.billingRecords[0].id },
                data: { status: 'REFUNDED' }
            });

            // Create refund record (you might want to add a Refund model)
            // Handle actual refund process through Zarinpal or bank API

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    message: "درخواست استرداد وجه با موفقیت ثبت شد",
                    payment
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async addPaymentMethod(req, res, next) {
        try {
            const { customerId, type, cardNumber, expMonth, expYear } = req.body;

            const customer = await prisma.customer.findUnique({
                where: { id: customerId }
            });

            if (!customer) {
                throw createHttpError.NotFound("مشتری مورد نظر یافت نشد");
            }

            // Validate card information
            if (type === 'CREDIT_CARD') {
                if (!this.#validateCardNumber(cardNumber)) {
                    throw createHttpError.BadRequest("شماره کارت نامعتبر است");
                }
            }

            const paymentMethod = await prisma.payment.create({
                data: {
                    customerId,
                    type,
                    last4: cardNumber.slice(-4),
                    expMonth: expMonth?.toString(),
                    expYear: expYear?.toString(),
                    amount: "0", // برای ذخیره روش پرداخت مقدار صفر
                    description: "افزودن روش پرداخت جدید"
                }
            });

            return res.status(StatusCodes.CREATED).json({
                statusCode: StatusCodes.CREATED,
                data: {
                    message: "روش پرداخت با موفقیت اضافه شد",
                    paymentMethod
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async createInvoice(req, res, next) {
        try {
            const { customerId, amount, items, dueDate } = req.body;

            const customer = await prisma.customer.findUnique({
                where: { id: customerId }
            });

            if (!customer) {
                throw createHttpError.NotFound("مشتری مورد نظر یافت نشد");
            }

            const invoice = await prisma.invoice.create({
                data: {
                    customerId,
                    amount: parseFloat(amount),
                    status: 'DRAFT',
                    dueDate: new Date(dueDate),
                    items: items || {},
                }
            });

            return res.status(StatusCodes.CREATED).json({
                statusCode: StatusCodes.CREATED,
                data: {
                    message: "صورتحساب با موفقیت ایجاد شد",
                    invoice
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async getCustomerBillingOverview(req, res, next) {
        try {
            const { customerId } = req.params;
            const { startDate, endDate } = req.query;

            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                include: {
                    paymentMethods: true,
                    invoices: {
                        where: {
                            createdAt: {
                                gte: startDate ? new Date(startDate) : undefined,
                                lte: endDate ? new Date(endDate) : undefined
                            }
                        }
                    }
                }
            });

            if (!customer) {
                throw createHttpError.NotFound("مشتری مورد نظر یافت نشد");
            }

            // محاسبه آمار کلی
            const totalPaid = customer.invoices
                .filter(inv => inv.status === 'PAID')
                .reduce((sum, inv) => sum + inv.amount, 0);

            const totalPending = customer.invoices
                .filter(inv => inv.status === 'OPEN')
                .reduce((sum, inv) => sum + inv.amount, 0);

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    customer: {
                        id: customer.id,
                        billingName: customer.billingName,
                        billingMobile: customer.billingMobile
                    },
                    paymentMethods: customer.paymentMethods,
                    billingOverview: {
                        totalPaid,
                        totalPending,
                        invoiceCount: customer.invoices.length
                    },
                    recentInvoices: customer.invoices.slice(0, 5)
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async updateInvoiceStatus(req, res, next) {
        try {
            const { invoiceId } = req.params;
            const { status } = req.body;

            const invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId }
            });

            if (!invoice) {
                throw createHttpError.NotFound("صورتحساب مورد نظر یافت نشد");
            }

            const updatedInvoice = await prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    status,
                    paidAt: status === 'PAID' ? new Date() : null
                }
            });

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    message: "وضعیت صورتحساب با موفقیت بروزرسانی شد",
                    invoice: updatedInvoice
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async getPaymentAnalytics(req, res, next) {
        try {
            const { startDate, endDate } = req.query;

            const dateFilter = {
                createdAt: {
                    gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                    lte: endDate ? new Date(endDate) : new Date()
                }
            };

            // آمار کلی پرداخت‌ها
            const payments = await prisma.payment.findMany({
                where: {
                    ...dateFilter,
                    verify: true
                }
            });

            // آمار صورتحساب‌ها
            const invoices = await prisma.invoice.findMany({
                where: dateFilter
            });

            // محاسبه آمار
            const analytics = {
                totalPayments: payments.length,
                totalAmount: payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
                paymentMethods: {
                    CREDIT_CARD: payments.filter(p => p.type === 'CREDIT_CARD').length,
                    BANK_TRANSFER: payments.filter(p => p.type === 'BANK_TRANSFER').length,
                    PAYPAL: payments.filter(p => p.type === 'PAYPAL').length
                },
                invoiceStats: {
                    total: invoices.length,
                    paid: invoices.filter(inv => inv.status === 'PAID').length,
                    pending: invoices.filter(inv => inv.status === 'OPEN').length,
                    overdue: invoices.filter(inv => 
                        inv.status === 'OPEN' && new Date(inv.dueDate) < new Date()
                    ).length
                },
                dailyTrend: await this.#calculateDailyTrend(payments)
            };

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    analytics,
                    dateRange: {
                        from: dateFilter.createdAt.gte,
                        to: dateFilter.createdAt.lte
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async handleFailedPayment(req, res, next) {
        try {
            const { paymentId } = req.params;
            const { errorCode, errorMessage } = req.body;

            const payment = await prisma.payment.findUnique({
                where: { id: paymentId }
            });

            if (!payment) {
                throw createHttpError.NotFound("تراکنش مورد نظر یافت نشد");
            }

            // ثبت خطای پرداخت
            await prisma.billingRecord.create({
                data: {
                    subscriptionId: payment.basketData.subscriptionId,
                    amount: parseFloat(payment.amount),
                    billingDate: new Date(),
                    status: 'FAILED',
                    paymentMethodId: payment.id,
                    metadata: {
                        errorCode,
                        errorMessage,
                        failureTime: new Date().toISOString()
                    }
                }
            });

            // اطلاع‌رسانی به کاربر (می‌توانید سیستم نوتیفیکیشن اضافه کنید)

            return res.status(StatusCodes.OK).json({
                statusCode: StatusCodes.OK,
                data: {
                    message: "اطلاعات خطای پرداخت با موفقیت ثبت شد",
                    payment
                }
            });

        } catch (error) {
            next(error);
        }
    }

    // Utility methods
    #validateCardNumber(cardNumber) {
        // اعتبارسنجی شماره کارت بانکی ایرانی
        if (!cardNumber || cardNumber.length !== 16) return false;
        
        let sum = 0;
        let alternate = false;
        
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let n = parseInt(cardNumber.charAt(i));
            if (alternate) {
                n *= 2;
                if (n > 9) n = (n % 10) + 1;
            }
            sum += n;
            alternate = !alternate;
        }
        
        return (sum % 10 === 0);
    }

    async #calculateDailyTrend(payments) {
        const dailyTrend = {};
        
        payments.forEach(payment => {
            const date = payment.createdAt.toISOString().split('T')[0];
            if (!dailyTrend[date]) {
                dailyTrend[date] = {
                    count: 0,
                    amount: 0
                };
            }
            dailyTrend[date].count++;
            dailyTrend[date].amount += parseFloat(payment.amount);
        });

        return Object.entries(dailyTrend)
            .map(([date, stats]) => ({
                date,
                ...stats
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
}

module.exports = {
    PaymentController: new PaymentController()
};



/*

این کنترلر شامل تمام عملیات‌های اصلی مربوط به پرداخت است. در ادامه توضیح مختصری درباره هر متد می‌دهم:

createPayment: ایجاد تراکنش جدید و اتصال به درگاه زرین‌پال
verifyPayment: تایید پرداخت و بررسی وضعیت تراکنش
getPaymentHistory: دریافت تاریخچه پرداخت‌های یک مشتری
getPaymentDetails: دریافت جزئیات یک تراکنش خاص
createRefund: ثبت درخواست استرداد وجه

نکات مهم پیاده‌سازی:

تبدیل خودکار تومان به ریال برای ارسال به زرین‌پال
ذخیره اطلاعات کامل تراکنش
مدیریت خطاها
پشتیبانی از صفحه‌بندی در تاریخچه پرداخت‌ها
ثبت سوابق پرداخت در جدول BillingRecord

برای استفاده از این کنترلر، نیاز به نصب پکیج زرین‌پال دارید:
bashCopynpm install zarinpal-checkout

هندلرهای جدید اضافه شده عبارتند از:

addPaymentMethod:

اضافه کردن روش پرداخت جدید برای مشتری
اعتبارسنجی اطلاعات کارت بانکی


createInvoice:

ایجاد صورتحساب جدید
مدیریت آیتم‌های صورتحساب


getCustomerBillingOverview:

دریافت خلاصه وضعیت مالی مشتری
شامل روش‌های پرداخت، صورتحساب‌ها و آمار کلی


updateInvoiceStatus:

بروزرسانی وضعیت صورتحساب
ثبت تاریخ پرداخت


getPaymentAnalytics:

گزارش‌گیری جامع از پرداخت‌ها
آمار روزانه و کلی
وضعیت صورتحساب‌ها


handleFailedPayment:

مدیریت پرداخت‌های ناموفق
ثبت جزئیات خطا



همچنین متدهای کمکی اضافه شده:

#validateCardNumber: اعتبارسنجی شماره کارت بانکی ایرانی
#calculateDailyTrend: محاسبه روند روزانه پرداخت‌ها

این هندلرها سیستم پرداخت شما را کامل‌تر می‌کنند و امکانات زیر را اضافه می‌کنند:

مدیریت روش‌های پرداخت
مدیریت صورتحساب‌ها
گزارش‌گیری و تحلیل
مدیریت خطاها و پرداخت‌های ناموفق
آمارگیری و داشبورد مالی
*/

    // async getListOfSubscriptionPayments(req, res, next){
    //     try {
    //         const transactions = await PaymentModel.find({}, {basket: 0}).sort({_id: -1})
    //         return res.status(HttpStatus.OK).json({
    //             statusCode: HttpStatus.OK,
    //             data: {
    //                 transactions
    //             }
    //         })
    //     } catch (error) {
    //         next(error)
    //     }
    // } // this is for Admin And Management For users subscribtion payments

