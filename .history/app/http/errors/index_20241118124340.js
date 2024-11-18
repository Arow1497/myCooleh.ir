const {AppError} = require('./AppError');
const {ValidationError} = require('./ValidationError');
const {AuthError} = require('./AuthError');
const {DatabaseError} = require('./DatabaseError');
const {NotFoundError} = require('./NotFoundError');
const {RateLimitError} = require('./RateLimitError');

module.exports = {
    AppError,
    ValidationError,
    AuthError,
    DatabaseError,
    NotFoundError,
    RateLimitError
};


// ساختاری که ایجاد کرده‌ای بسیار حرفه‌ای است و به مدیریت خطاها نظم و انعطاف بیشتری می‌دهد. 
// با این روش، خطاهای مختلف را می‌توان به صورت کلاس‌های جداگانه تعریف کرد و با توجه به نوع خطا،
//  پیام‌ها و کدهای وضعیت (HTTP Status Codes) مرتبط را مدیریت کرد.

// پاسخ به سوال:
// بله، شما یک سیستم مدیریت خطای محلی ایجاد کرده‌اید که می‌تواند جایگزین مستقیم استفاده از http-status-codes 
// در ریسپانس‌ها باشد. این سیستم برای تولید و مدیریت خطاها در بخش‌های مختلف برنامه طراحی شده و نیازی 
// به تغییر در ساختار ریسپانس‌های موفق نیست.

// نحوه استفاده از سیستم خطای جدید:
// برای استفاده از این سیستم،
//  باید خطاهای مرتبط را در بخش‌هایی از کد که ممکن است خطا رخ دهد (مثل سرویس‌ها یا هندلرها) ایجاد و پرتاب (throw) کنی. سپس،
//   با استفاده از یک میدلور عمومی برای مدیریت خطاها (error-handling middleware)، این خطاها را هندل کنی و پاسخ مناسب را به کلاینت ارسال کنی.

// قدم‌های پیاده‌سازی
// 1. پرتاب خطاها در کد
// در بخش‌هایی از کد که احتمال وقوع خطا وجود دارد، می‌توانی از کلاس‌های خطای جدید استفاده کنی. برای مثال:

// javascript
// Copy code
// const { AuthError, ValidationError } = require('./error');

// در یک سرویس:
// async function createPartOrder(user, body) {
//     if (!user) {
//         throw new AuthError('دسترسی غیرمجاز: لطفاً وارد شوید.');
//     }

//     if (!body.partName) {
//         throw new ValidationError('نام قطعه الزامی است.');
//     }

    // ادامه‌ی منطق سرویس
// }
// 2. هندل خطاها در میدلور
// یک میدلور برای مدیریت خطاها در سطح برنامه اضافه کن.
//  این میدلور تمام خطاهای پرتاب‌شده (throw) را دریافت و به کلاینت پاسخ مناسب ارسال می‌کند.

// javascript
// Copy code
// میدلور مدیریت خطا
// const { AppError } = require('./error');

// function errorHandler(err, req, res, next) {
    // اگر خطا از نوع AppError است، جزئیات آن را استفاده کن
//     if (err instanceof AppError) {
//         return res.status(err.statusCode).json({
//             statusCode: err.statusCode,
//             error: {
//                 name: err.name,
//                 message: err.message
//             }
//         });
//     }

    // برای خطاهای ناشناخته
//     console.error('Unhandled Error:', err);
//     res.status(500).json({
//         statusCode: 500,
//         error: {
//             name: 'InternalServerError',
//             message: 'خطای داخلی سرور رخ داده است.'
//         }
//     });
// }

// module.exports = errorHandler;
// 3. استفاده از میدلور در اپلیکیشن
// میدلور مدیریت خطا را در انتهای تمام روت‌ها در فایل اصلی اپلیکیشن اعمال کن:

// javascript
// Copy code
// const express = require('express');
// const errorHandler = require('./path-to-error-handler');

// const app = express();

// تعریف روت‌ها
// app.use('/api', routes);

// مدیریت خطا
// app.use(errorHandler);

// app.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
// });
// 4. مثال هندلر با خطا
// یک هندلر که از این سیستم استفاده می‌کند، به صورت زیر خواهد بود:

// javascript
// Copy code
// const { GaragePartOrdersService } = require('./services');
// const { AuthError } = require('./error');
// const { StatusCodes: HttpStatus } = require("http-status-codes");

// async function createPartOrder(req, res, next) {
//     try {
//         const result = await GaragePartOrdersService.createPartOrder(
//             req.user,
//             req.body,
//             req.params,
//             req.files
//         );

//         return res.status(HttpStatus.CREATED).json({
//             statusCode: HttpStatus.CREATED,
//             data: {
//                 message: "درخواست تامین قطعه با موفقیت ثبت شد",
//                 orders: result.orders,
//                 share: result.share
//             }
//         });
//     } catch (error) {
//         if (error instanceof AuthError) {
//             console.warn('Auth Error:', error.message);
//         }

        // ارسال خطا به میدلور
//         next(error);
//     }
// }

// module.exports = { createPartOrder };
// نکات کلیدی:
// جایگزین http-status-codes نمی‌شود: پکیج http-status-codes همچنان می‌تواند برای پاسخ‌های موفقیت‌آمیز 
// (مانند 201 Created) استفاده شود. اما برای مدیریت خطا، از سیستم جدید استفاده کن.
// انعطاف بالا: می‌توان انواع خطاها را به راحتی گسترش داد و پیام‌های دقیق‌تر یا جزئیات خاصی مثل code برای کلاینت ارسال کرد.
// خطاهای غیرمنتظره: خطاهای ناشناخته (مثل خطای داخلی سرور) به خوبی با بخش else در میدلور مدیریت خطا هندل می‌شوند.
// این ساختار باعث می‌شود مدیریت خطا در پروژه مقیاس‌پذیرتر و منسجم‌تر باشد. اگر نیاز به تغییر یا گسترش داشتی، بگو!