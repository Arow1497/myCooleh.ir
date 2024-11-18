// config/winston.js

const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Create the logger
const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for production
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '../logs/application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Create a wrapper with the methods we need
const logger = {
  error: (message, meta = {}) => winstonLogger.error(message, { metadata: meta }),
  warn: (message, meta = {}) => winstonLogger.warn(message, { metadata: meta }),
  info: (message, meta = {}) => winstonLogger.info(message, { metadata: meta }),
  debug: (message, meta = {}) => winstonLogger.debug(message, { metadata: meta }),
  // Add http method that actually uses info level
  http: (message, meta = {}) => winstonLogger.info(message, { 
    metadata: { ...meta, type: 'http_log' } 
  })
};

module.exports = { logger };

// درباره loggerMiddleware
// تابع loggerMiddleware یک middleware در Express است که هدفش اضافه کردن دسته‌بندی‌های پویا 
// به لاگ‌ها در طول هر درخواست است. این تابع، ویژگی‌هایی مثل moduleName و requestId را به‌طور اختصاصی برای
//  هر درخواست تنظیم می‌کند و یک logger child ایجاد می‌کند که در هر endpoint قابل استفاده است.

// کاربرد loggerMiddleware
// ردیابی درخواست‌ها: اضافه کردن یک requestId به هر درخواست، امکان ردیابی تمام لاگ‌های مرتبط با آن درخواست را فراهم می‌کند.
// دسته‌بندی لاگ‌ها: می‌توانید moduleName را بر اساس بخش‌های مختلف اپلیکیشن (مانند API، Authentication، Database) تنظیم کنید.
// ایجاد لاگ‌های منحصر به هر درخواست: به جای استفاده از logger اصلی،
//  از یک نسخه child استفاده می‌شود که متادیتای خاصی برای هر درخواست دارد.
// نحوه استفاده از loggerMiddleware
// اضافه کردن به Express: در فایل app.js یا server.js، این middleware را به اپلیکیشن اضافه کنید:

// javascript
// Copy code
// const express = require('express');
// const { loggerMiddleware } = require('./path/to/logger-config');

// const app = express();

// استفاده از loggerMiddleware
// app.use(loggerMiddleware);
// استفاده در route‌ها: پس از تنظیم middleware، در هر route می‌توانید از req.logger استفاده کنید:

// javascript
// Copy code
// app.get('/example', (req, res) => {
//   req.logger.info('Example endpoint called');
//   res.send('Check the logs!');
// });
// خروجی لاگ برای این درخواست:

// json
// Copy code
// {
//   "timestamp": "2024-11-17 12:34:56",
//   "level": "info",
//   "message": "Example endpoint called",
//   "service": "user-service",
//   "environment": "development",
//   "moduleName": "API",
//   "requestId": "req-abcdef123456"
// }
// مثال برای dynamic moduleName: اگر می‌خواهید moduleName را برای هر بخش متفاوت تنظیم کنید، می‌توانید به صورت زیر در route‌های خاص تغییر دهید:

// javascript
// Copy code
// app.get('/auth/login', (req, res) => {
//   req.logger = req.logger.child({ moduleName: 'Authentication' });
//   req.logger.info('Login endpoint called');
//   res.send('Login success');
// });
// مسیرهای ذخیره‌سازی لاگ‌ها:
// لاگ‌های سطح error:
// در فایل‌هایی مانند:
// ../logs/error-YYYY-MM-DD.log

// این فایل‌ها به صورت روزانه چرخش پیدا می‌کنند (با استفاده از winston-daily-rotate-file) و حداکثر اندازه هر فایل 20 مگابایت است.
// فایل‌ها تا 14 روز نگهداری می‌شوند و پس از آن حذف می‌شوند.
// لاگ‌های ترکیبی (combined):
// در فایل‌هایی مانند:
// ../logs/combined-YYYY-MM-DD.log

// شامل تمام لاگ‌ها از سطوح مختلف (info, warn, http, debug) است.
// همان تنظیمات چرخش و نگهداری را دارد.
// لاگ‌های خطاهای مدیریت‌نشده (Unhandled Exceptions):
// در فایل‌هایی مانند:
// ../logs/exceptions-YYYY-MM-DD.log

// خطاهایی که توسط Winston مدیریت نشده‌اند در این فایل ذخیره می‌شوند.
// لاگ‌های ریجکت‌شده (Unhandled Promise Rejections):
// در فایل‌هایی مانند:
// ../logs/rejections-YYYY-MM-DD.log

// خطاهایی که در Promise‌ها مدیریت نشده‌اند در این فایل ذخیره می‌شوند.
// لاگ‌های کنسول (فقط برای محیط‌های غیرفرآیندی):
// اگر محیط NODE_ENV برابر با production نباشد، لاگ‌ها علاوه بر فایل‌ها، به کنسول نیز ارسال می‌شوند و رنگی نمایش داده می‌شوند.

// ساختار پوشه لاگ‌ها:
// تمام لاگ‌ها در پوشه ../logs/ ذخیره می‌شوند که محل نسبی آن نسبت به فایل کانفیگ فعلی تعریف شده است.
// هر فایل لاگ با تاریخ روز (YYYY-MM-DD) در نام فایل ذخیره می‌شود.
// جمع‌بندی:
// این تنظیمات باعث می‌شود:

// لاگ‌ها سازمان‌یافته و مرتب در فایل‌های مختلف ذخیره شوند.
// برای هر سطح از لاگ، یک فایل مجزا داشته باشید.
// لاگ‌های قدیمی به صورت خودکار پاک شوند (پس از 14 روز).
// اگر نیاز به تغییر مکان ذخیره‌سازی یا تنظیمات بیشتری دارید، می‌توانید مسیر filename را به یک مکان دیگر (مثلاً روی سرور ابری یا شبکه) تغییر دهید.