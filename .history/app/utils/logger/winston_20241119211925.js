const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');
const Transport = require('winston-transport');
require('source-map-support').install();
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '../../logs');

const createLogDirectories = () => {
  const types = ['error', 'security', 'performance', 'system', 'custom', 'general'];
  
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  types.forEach(type => {
    const typeDir = path.join(LOG_DIR, type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
  });
};

createLogDirectories();

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  security: 2,  // Same level as info
  system: 2,    // Same level as info
  performance: 2, // Same level as info
  custom: 2     // Same level as info
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  security: 'cyan',
  system: 'grey',
  performance: 'blue',
  custom: 'green'
};
winston.addColors(colors);

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

const logSchema = new mongoose.Schema({
  timestamp: Date,
  level: String,
  message: String,
  context: Object,
  location: Object,
  metadata: Object,
  stack: String,
}, { timestamps: true });

class EnhancedMongoTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.collection = mongoose.model('Log', logSchema).collection;
  }

  async log(info, callback) {
    try {
      await this.collection.insertOne({
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
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

const getLogFileName = (type) => {
  const date = moment().format('YYYY-MM-DD');
  return path.join(LOG_DIR, type, `${type}-${date}.log`);
};


const createCustomFormat = (logType) => {
  return winston.format((info) => {
    // بررسی وجود logType و تطابق آن با مقدار مورد انتظار
    if (info.metadata && info.metadata.logType === logType) {
      return info;
    }
    return false; // لاگ فیلتر شود اگر نوع لاگ مطابقت ندارد
  })();
};



const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Error logs
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('error'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: winston.format.combine(
        detailedFormat,
        createCustomFormat('error')
      )
    }),

    // Security logs
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('security'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      zippedArchive: true,
      format: winston.format.combine(
        detailedFormat,
        createCustomFormat('security')
      )
    }),

    // Performance logs
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('performance'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d',
      zippedArchive: true,
      format: winston.format.combine(
        detailedFormat,
        createCustomFormat('performance')
      )
    }),

    // System logs
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('system'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
      format: winston.format.combine(
        detailedFormat,
        createCustomFormat('system')
      )
    }),

    // Custom logs
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('custom'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
      format: winston.format.combine(
        detailedFormat,
        createCustomFormat('custom')
      )
    }),

    // General logs for all non-categorized logs
    new winston.transports.DailyRotateFile({
      filename: getLogFileName('general'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: winston.format.combine(
        detailedFormat,
        createCustomFormat('general')
      )
    }),

    // MongoDB Transport
    new EnhancedMongoTransport({
      level: 'info',
      collection: 'application_logs',
      format: detailedFormat,
      options: { 
        useUnifiedTopology: true,
        expireAfterSeconds: 14 * 24 * 60 * 60
      }
    })
  ]
});

// Enhanced logging methods
logger.security = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'security' });
};

logger.performance = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'performance' });
};

logger.system = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'system' });
};

logger.custom = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'custom' });
};

logger.general = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'general' });
};

logger.logError = function(err, metadata = {}, context = {}) {
  const errorLocation = getErrorLocation(err);
  this.error(err.message, {
    error: err,
    errorLocation,
    context,
    logType: 'error',
    ...metadata
  });
};

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf(({ level, message, timestamp, context, metadata, logType }) => {
        let output = `${timestamp} [${logType || 'general'}] ${level}: ${message}`;
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
/*
درباره loggerMiddleware
تابع loggerMiddleware یک middleware در Express است که هدفش اضافه کردن دسته‌بندی‌های پویا 
به لاگ‌ها در طول هر درخواست است. این تابع، ویژگی‌هایی مثل moduleName و requestId را به‌طور اختصاصی برای
 هر درخواست تنظیم می‌کند و یک logger child ایجاد می‌کند که در هر endpoint قابل استفاده است.

کاربرد loggerMiddleware
ردیابی درخواست‌ها: اضافه کردن یک requestId به هر درخواست، امکان ردیابی تمام لاگ‌های مرتبط با آن درخواست را فراهم می‌کند.
دسته‌بندی لاگ‌ها: می‌توانید moduleName را بر اساس بخش‌های مختلف اپلیکیشن (مانند API، Authentication، Database) تنظیم کنید.
ایجاد لاگ‌های منحصر به هر درخواست: به جای استفاده از logger اصلی،
 از یک نسخه child استفاده می‌شود که متادیتای خاصی برای هر درخواست دارد.
نحوه استفاده از loggerMiddleware
اضافه کردن به Express: در فایل app.js یا server.js، این middleware را به اپلیکیشن اضافه کنید:

javascript
Copy code
const express = require('express');
const { loggerMiddleware } = require('./path/to/logger-config');

const app = express();

استفاده از loggerMiddleware
app.use(loggerMiddleware);
استفاده در route‌ها: پس از تنظیم middleware، در هر route می‌توانید از req.logger استفاده کنید:

javascript
Copy code
app.get('/example', (req, res) => {
  req.logger.info('Example endpoint called');
  res.send('Check the logs!');
});
خروجی لاگ برای این درخواست:

json
Copy code
{
  "timestamp": "2024-11-17 12:34:56",
  "level": "info",
  "message": "Example endpoint called",
  "service": "user-service",
  "environment": "development",
  "moduleName": "API",
  "requestId": "req-abcdef123456"
}
مثال برای dynamic moduleName: اگر می‌خواهید moduleName را برای هر بخش متفاوت تنظیم کنید، می‌توانید به صورت زیر در route‌های خاص تغییر دهید:

javascript
Copy code
app.get('/auth/login', (req, res) => {
  req.logger = req.logger.child({ moduleName: 'Authentication' });
  req.logger.info('Login endpoint called');
  res.send('Login success');
});
مسیرهای ذخیره‌سازی لاگ‌ها:
لاگ‌های سطح error:
در فایل‌هایی مانند:
../logs/error-YYYY-MM-DD.log

این فایل‌ها به صورت روزانه چرخش پیدا می‌کنند (با استفاده از winston-daily-rotate-file) و حداکثر اندازه هر فایل 20 مگابایت است.
فایل‌ها تا 14 روز نگهداری می‌شوند و پس از آن حذف می‌شوند.
لاگ‌های ترکیبی (combined):
در فایل‌هایی مانند:
../logs/combined-YYYY-MM-DD.log

شامل تمام لاگ‌ها از سطوح مختلف (info, warn, http, debug) است.
همان تنظیمات چرخش و نگهداری را دارد.
لاگ‌های خطاهای مدیریت‌نشده (Unhandled Exceptions):
در فایل‌هایی مانند:
../logs/exceptions-YYYY-MM-DD.log

خطاهایی که توسط Winston مدیریت نشده‌اند در این فایل ذخیره می‌شوند.
لاگ‌های ریجکت‌شده (Unhandled Promise Rejections):
در فایل‌هایی مانند:
../logs/rejections-YYYY-MM-DD.log

خطاهایی که در Promise‌ها مدیریت نشده‌اند در این فایل ذخیره می‌شوند.
لاگ‌های کنسول (فقط برای محیط‌های غیرفرآیندی):
اگر محیط NODE_ENV برابر با production نباشد، لاگ‌ها علاوه بر فایل‌ها، به کنسول نیز ارسال می‌شوند و رنگی نمایش داده می‌شوند.

ساختار پوشه لاگ‌ها:
تمام لاگ‌ها در پوشه ../logs/ ذخیره می‌شوند که محل نسبی آن نسبت به فایل کانفیگ فعلی تعریف شده است.
هر فایل لاگ با تاریخ روز (YYYY-MM-DD) در نام فایل ذخیره می‌شود.
جمع‌بندی:
این تنظیمات باعث می‌شود:

لاگ‌ها سازمان‌یافته و مرتب در فایل‌های مختلف ذخیره شوند.
برای هر سطح از لاگ، یک فایل مجزا داشته باشید.
لاگ‌های قدیمی به صورت خودکار پاک شوند (پس از 14 روز).
اگر نیاز به تغییر مکان ذخیره‌سازی یا تنظیمات بیشتری دارید، می‌توانید مسیر filename را به یک مکان دیگر (مثلاً روی سرور ابری یا شبکه) تغییر دهید.
*/