const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');
const { MongoDB } = require('winston-mongodb');

// تنظیمات سطوح لاگ
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// تنظیمات رنگ‌بندی لاگ‌ها برای کنسول
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// فرمت لاگ‌ها
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// ذخیره لاگ‌ها در فایل‌های روزانه
const fileTransports = [
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
];

// ذخیره لاگ‌ها در MongoDB
const mongoDBTransport = new MongoDB({
  db: 'mongodb://localhost:27017/logs', // آدرس دیتابیس MongoDB
  collection: 'application_logs',      // نام کالکشن لاگ‌ها
  level: 'info',                       // حداقل سطح لاگ
  // options: { useUnifiedTopology: true },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// تعریف Logger
// اضافه کردن فیلدهای دسته‌بندی و قابل‌ردیابی
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
    moduleName: 'unknown', // مقدار پیش‌فرض
    requestId: 'N/A',      // مقدار پیش‌فرض
  },
  transports: [
    ...fileTransports,    // انتقال به فایل‌ها
    mongoDBTransport,     // انتقال به MongoDB
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '../logs/exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '../logs/rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

// اضافه کردن Console برای محیط توسعه
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
    ),
  }));
}

// افزودن middleware برای تنظیم پویا
function loggerMiddleware(req, res, next) {
  // اضافه کردن requestId و moduleName به context لاگ‌ها
  req.logger = logger.child({
    moduleName: 'API',
    requestId: req.headers['x-request-id'] || `req-${Math.random().toString(36).substring(2, 15)}`,
  });
  next();
}

module.exports = { logger, loggerMiddleware };

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