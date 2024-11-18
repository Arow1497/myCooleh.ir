const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');
const { MongoDB } = require('winston-mongodb');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const errorFormat = winston.format.printf(({ level, message, timestamp, stack, metadata }) => {
  let output = `${timestamp} ${level}: ${message}`;
  
  if (stack) {
    output += `\nStack Trace:\n${stack}`;
  }
  
  if (metadata) {
    output += `\nMetadata:\n${JSON.stringify(metadata, null, 2)}`;
  }
  
  return output;
});

// فرمت پیشرفته برای نمایش جزئیات خطا
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] }),
  errorFormat
);
  winston.format.json(),
  winston.format.printf(info => {
    // اضافه کردن اطلاعات مکان خطا
    const errorLocation = info.stack ? extractErrorLocation(info.stack) : '';
    const metadata = info.metadata ? JSON.stringify(info.metadata) : '';
    
    return `${info.timestamp} ${info.level}: ${info.message}
    Location: ${errorLocation}
    Stack: ${info.stack || 'No stack trace'}
    Metadata: ${metadata}
    ModuleName: ${info.metadata.moduleName || 'unknown'}
    RequestId: ${info.metadata.requestId || 'N/A'}
    `;
  });

// تابع استخراج مکان خطا از stack trace
function extractErrorLocation(stack) {
  try {
    const stackLines = stack.split('\n');
    // حذف خط اول که پیام خطاست
    const firstStackLine = stackLines[1] || '';
    // استخراج نام فایل و شماره خط
    const match = firstStackLine.match(/at\s+(.+?)(?::(\d+):(\d+))?$/);
    if (match) {
      const [_, location, line, column] = match;
      return `${location.trim()} (line: ${line}, column: ${column})`;
    }
    return firstStackLine.trim();
  } catch (err) {
    return 'Could not extract error location';
  }
}

const fileTransports = [
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
    format: detailedFormat
  }),
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
    format: detailedFormat
  }),
];

const mongoDBTransport = new MongoDB({
  db: 'mongodb://localhost:27017/logs',
  collection: 'application_logs',
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata(),
    winston.format.json()
  ),
  metaKey: 'metadata'
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: detailedFormat,
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
    moduleName: 'unknown',
    requestId: 'N/A',
  },
  transports: [
    ...fileTransports,
    mongoDBTransport,
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '../logs/exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: detailedFormat
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '../logs/rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: detailedFormat
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => {
        const errorLocation = info.stack ? extractErrorLocation(info.stack) : '';
        return `${info.timestamp} ${info.level}: ${info.message}
        ${errorLocation ? `\nLocation: ${errorLocation}` : ''}
        ${info.stack ? `\nStack: ${info.stack}` : ''}`;
      })
    ),
  }));
}

// میدلور پیشرفته برای ثبت اطلاعات بیشتر
function loggerMiddleware(req, res, next) {
  req.logger = logger.child({
    moduleName: req.path.split('/')[1] || 'API',
    requestId: req.headers['x-request-id'] || `req-${Math.random().toString(36).substring(2, 15)}`,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('user-agent'),
  });
  next();
}

// تابع کمکی برای لاگ کردن خطاها با جزئیات بیشتر
logger.logError = function(error, metadata = {}) {
  this.error({
    message: error.message,
    stack: error.stack,
    metadata: {
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
      params: req.params,
      errorName: err.name,
      errorCode: err.code
  }
  });
};

// اضافه کردن middleware برای لاگ کردن خطاها
const errorLoggingMiddleware = (err, req, res, next) => {
  logger.logError(err, req);
  next(err);
};


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