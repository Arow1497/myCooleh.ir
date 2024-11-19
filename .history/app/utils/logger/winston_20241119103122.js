const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');
const Transport = require('winston-transport');
require('source-map-support').install();
const mongoose = require('mongoose');
const moment = require('moment');

// Unified log directory
const LOG_DIR = path.join(__dirname, '../../logs');

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

// Enhanced error location tracking
function getErrorLocation(error) {
  if (!error || !error.stack) return null;

  const stackLines = error.stack.split('\n');
  const relevantLine = stackLines.find(line => {
    return line.includes('at ') && 
           !line.includes('node_modules') && 
           !line.includes('winston.js') &&
           !line.includes('/winston/') &&
           !line.includes('errorHandling.middleware.js');
  });

  if (!relevantLine) return null;

  const match = relevantLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
  if (!match) return null;

  const [_, functionName = 'anonymous', filePath, line, column] = match;
  return {
    function: functionName,
    file: path.basename(filePath),
    line,
    column,
    fullPath: filePath
  };
}

// Enhanced error format with structured data
const errorFormat = winston.format.printf(({ level, message, timestamp, stack, metadata, error, errorLocation, context }) => {
  const logObject = {
    timestamp,
    level,
    message,
    context: context || {},
    location: errorLocation || (error ? getErrorLocation(error) : null),
    stack: stack || (error?.stack),
    metadata: metadata || {},
  };

  return JSON.stringify(logObject);
});

const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack', 'error', 'errorLocation', 'context'] }),
  errorFormat
);

// MongoDB Schema for structured logging
const logSchema = new mongoose.Schema({
  timestamp: Date,
  level: String,
  message: String,
  context: Object,
  location: Object,
  metadata: Object,
  stack: String,
}, { timestamps: true });

// Custom MongoDB Transport with Schema
class EnhancedMongoTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.collection = mongoose.model('Log', logSchema).collection;
  }

  async log(info, callback) {
    try {
      await this.collection.insertOne({
        timestamp: new Date(),
        level: info.level,
        message: info.message,
        context: info.context || {},
        location: info.errorLocation,
        metadata: info.metadata || {},
        stack: info.stack
      });
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

const getLogFileName = (type, level) => {
  const date = moment().format('YYYY-MM-DD');
  const hour = moment().format('HH-MM'); // ساعت فعلی
  return path.join(LOG_DIR, `${type}-${date}`, `${hour}-${level}.log`);
};

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: detailedFormat,
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('error', 'error'),
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('combined', 'combined'),
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    // MongoDB Transport
    new EnhancedMongoTransport({
      level: 'info',
      collection: 'application_logs',
      format: detailedFormat,
      options: { 
        useUnifiedTopology: true,
        // اضافه کردن TTL index برای پاک کردن خودکار لاگ‌های قدیمی
        expireAfterSeconds: 14 * 24 * 60 * 60 // 14 روز
      }
    }),
    // اضافه کردن لاگ برای موارد حساس امنیتی
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '10m',
      maxFiles: '30d', // نگهداری طولانی‌تر برای لاگ‌های امنیتی
      zippedArchive: true,
      format: detailedFormat
    })
  ]
});

// Enhanced error logging method with context
logger.logError = function(err, metadata = {}, context = {}) {
  const errorLocation = getErrorLocation(err);
  this.error(err.message, {
    error: err,
    errorLocation,
    context,
    ...metadata
  });
};

// Development console logging
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf(({ level, message, timestamp, context, metadata }) => {
        let output = `${timestamp} ${level}: ${message}`;
        if (context && Object.keys(context).length) {
          output += `\nContext: ${JSON.stringify(context, null, 2)}`;
        }
        if (metadata && Object.keys(metadata).length) {
          output += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
        }
        return output;
      })
    )
  }));
}

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