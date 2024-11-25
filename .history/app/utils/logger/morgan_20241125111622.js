const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const path = require('path');
const {logger} = require('./winston');
const fs = require("fs")
const moment = require('moment')
// Create logs directory if it doesn't exist
const LOG_DIR = path.join(__dirname, '../../logs/morganlogs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a rotating write stream for access logs
const accessLogStream = rfs.createStream(`${moment().format('YYYY-MM-DD')}-access.log`, {
  interval: '1d', // تنظیمات برای تغییر روزانه
  path: LOG_DIR,
  size: '10M',    // اندازه فایل لاگ حداکثر 10 مگابایت
  compress: 'gzip', // فشرده‌سازی فایل‌های لاگ
  maxFiles: 14,     // تعداد حداکثر فایل‌ها
  teeToStdout: true // این تنظیم باعث می‌شود که لاگ‌ها در کنسول نیز چاپ شوند
});

// Enhanced tokens
morgan.token('response-time-formatted', (req, res) => {
  const time = res.responseTime;
  if (time < 1000) return time + 'ms';
  return (time / 1000).toFixed(3) + 's';
});

morgan.token('remote-addr', (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.socket.remoteAddress;
});

morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

morgan.token('request-id', (req) => {
  return req.id || '-';
});

const localTimeStamp = () => moment().format('YYYY-MM-DD HH:mm:ss');
// Enhanced format with additional useful information
const morganFormat = [
  `[${localTimeStamp()}]`, // زمان محلی
  ':remote-addr',
  '[:date[iso]]',
  ':request-id',
  ':user-id',
  '":method :url HTTP/:http-version"',
  ':status',
  ':response-time-formatted',
  '":referrer"',
  '":user-agent"'
].join(' ');

// Create Morgan middleware with enhanced logging
const morganMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Write to file
      accessLogStream.write(message);
      logger.info(message.trim(), {
        type: 'access_log',
        component: 'morgan',
        context: {
          logType: 'access'
        }
      });
    }
  },
  skip: (req, res) => {
    // Skip health checks and static assets in production
    if (process.env.NODE_ENV === 'production') {
      return (req.url === '/health' && res.statusCode === 200) ||
             req.url.startsWith('/static/') ||
             req.url.startsWith('/assets/');
    }
    return false;
  }
});

module.exports = {
  morganMiddleware,
  accessLogStream,
  morganFormat
};











/*

const winston = require('winston');
const path = require('path');
const morgan = require('morgan');
const Transport = require('winston-transport');
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');
require('winston-daily-rotate-file');

// افزودن قابلیت گزارش‌گیری از منابع سیستم
const os = require('os');
const { execSync } = require('child_process');

// تنظیمات پایه
const LOG_DIR = path.join(__dirname, '../../logs');
const MAX_LOG_SIZE = process.env.MAX_LOG_SIZE || '20m';
const MAX_LOG_FILES = process.env.MAX_LOG_FILES || '14d';

// تعریف سطوح لاگ با اولویت‌بندی دقیق‌تر
const levels = {
  fatal: 0,    // خطاهای بحرانی که نیاز به توجه فوری دارند
  error: 1,    // خطاهای عادی
  warn: 2,     // هشدارها
  security: 3, // رویدادهای امنیتی
  info: 4,     // اطلاعات عمومی
  http: 5,     // درخواست‌های HTTP
  debug: 6,    // اطلاعات دیباگ
  trace: 7     // جزئیات کامل برای ردیابی
};

// تعریف رنگ‌های متمایز برای هر سطح
const colors = {
  fatal: 'red bgWhite bold',
  error: 'red bold',
  warn: 'yellow bold',
  security: 'magenta bold',
  info: 'green',
  http: 'cyan',
  debug: 'blue',
  trace: 'gray'
};

winston.addColors(colors);

// افزودن فیلدهای جدید به طرح لاگ مونگو
const logSchema = new mongoose.Schema({
  timestamp: Date,
  level: String,
  message: String,
  context: Object,
  location: Object,
  metadata: Object,
  stack: String,
  systemMetrics: {
    cpu: Number,
    memory: Number,
    uptime: Number
  },
  requestId: String,
  userId: String,
  sessionId: String
}, { 
  timestamps: true,
  index: { 
    timestamp: -1,
    level: 1,
    requestId: 1 
  }
});

// ایجاد فرمت پیشرفته برای لاگ‌ها
const enhancedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.printf(({ timestamp, level, message, metadata, stack, context, systemMetrics }) => {
    const requestId = metadata.requestId || 'N/A';
    const userId = metadata.userId || 'N/A';
    
    let output = `[${timestamp}] [${level.toUpperCase()}] [ReqID: ${requestId}] [UserID: ${userId}]: ${message}`;
    
    if (context) {
      output += `\nContext: ${JSON.stringify(context)}`;
    }
    
    if (systemMetrics) {
      output += `\nSystem Metrics: CPU: ${systemMetrics.cpu}%, Memory: ${systemMetrics.memory}MB`;
    }
    
    if (stack) {
      output += `\nStack Trace:\n${stack}`;
    }
    
    if (metadata && Object.keys(metadata).length > 0) {
      output += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return output;
  })
);

// کلاس برای جمع‌آوری متریک‌های سیستم
class SystemMetricsCollector {
  static collect() {
    const cpuUsage = os.loadavg()[0];
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = (totalMemory - freeMemory) / 1024 / 1024; // Convert to MB
    
    return {
      cpu: cpuUsage.toFixed(2),
      memory: usedMemory.toFixed(2),
      uptime: os.uptime()
    };
  }
}

// ایجاد ترنسپورت سفارشی برای مونیتورینگ سیستم
class MonitoringTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.metricsThreshold = opts.metricsThreshold || {
      cpu: 80,
      memory: 80
    };
  }

  log(info, callback) {
    const metrics = SystemMetricsCollector.collect();
    
    if (metrics.cpu > this.metricsThreshold.cpu || 
        metrics.memory > this.metricsThreshold.memory) {
      // ارسال هشدار به سیستم مانیتورینگ
      this.emit('alert', {
        timestamp: new Date(),
        metrics,
        message: 'System resources threshold exceeded'
      });
    }
    
    callback();
  }
}

// تابع ایجاد لاگر
function createLogger() {
  const transports = [
    // روتیشن فایل برای خطاها
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      format: enhancedFormat
    }),
    
    // روتیشن فایل برای لاگ‌های امنیتی
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'security',
      maxSize: MAX_LOG_SIZE,
      maxFiles: '30d', // نگهداری طولانی‌تر برای لاگ‌های امنیتی
      format: enhancedFormat
    }),
    
    // مانیتورینگ سیستم
    new MonitoringTransport({
      level: 'info',
      metricsThreshold: {
        cpu: process.env.CPU_THRESHOLD || 80,
        memory: process.env.MEMORY_THRESHOLD || 80
      }
    })
  ];

  // افزودن ترنسپورت کنسول در محیط توسعه
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );
  }

  return winston.createLogger({
    levels,
    format: enhancedFormat,
    transports,
    exitOnError: false
  });
}

// ایجاد میدلور مورگان با ثبت در وینستون
function createMorganMiddleware(logger) {
  return morgan('combined', {
    stream: {
      write: (message) => {
        logger.http(message.trim(), {
          timestamp: new Date().toISOString(),
          type: 'access_log'
        });
      }
    }
  });
}

// تابع کمکی برای ثبت خطاها
function logError(logger, error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    context,
    systemMetrics: SystemMetricsCollector.collect()
  };

  if (error.response) {
    errorInfo.response = {
      status: error.response.status,
      headers: error.response.headers,
      data: error.response.data
    };
  }

  logger.error('An error occurred', errorInfo);
}

module.exports = {
  createLogger,
  createMorganMiddleware,
  logError,
  SystemMetricsCollector
};


بهبودهای اعمال شده در کانفیگ جدید:

سطوح لاگینگ بهتر:

اضافه کردن سطح fatal برای خطاهای بحرانی
اضافه کردن سطح trace برای ردیابی دقیق‌تر
اولویت‌بندی بهتر سطوح


مانیتورینگ سیستم:

اضافه کردن SystemMetricsCollector برای جمع‌آوری اطلاعات سیستم
ثبت CPU و Memory usage
هشدار خودکار در صورت تجاوز از آستانه‌های تعریف شده


فرمت‌بندی پیشرفته:

اضافه کردن RequestID و UserID به لاگ‌ها
نمایش بهتر متریک‌های سیستم
رنگ‌بندی پیشرفته‌تر برای خوانایی بهتر


بهبود ذخیره‌سازی در MongoDB:

اضافه کردن ایندکس‌های مناسب
ذخیره اطلاعات سیستم
ذخیره اطلاعات جلسه و کاربر


مدیریت بهتر خطاها:

تابع کمکی logError برای ثبت جزئیات بیشتر خطاها
ثبت اطلاعات پاسخ در صورت وجود
ثبت متریک‌های سیستم در زمان خطا


انعطاف‌پذیری بیشتر:

استفاده از متغیرهای محیطی برای تنظیمات
قابلیت تنظیم آستانه‌های هشدار
روتیشن فایل با تنظیمات قابل تغییر


ادغام بهتر با Morgan:

میدلور سفارشی برای ثبت لاگ‌های HTTP
ثبت timestamp دقیق‌تر
دسته‌بندی بهتر لاگ‌های دسترسی



برای استفاده از این کانفیگ جدید، کافیست:
javascriptCopyconst { createLogger, createMorganMiddleware } = require('./logger');

const logger = createLogger();
const morganMiddleware = createMorganMiddleware(logger);

app.use(morganMiddleware);

// استفاده از لاگر
logger.info('Application started', { version: '1.0.0' });
logger.security('User login attempt', { userId: '123' });
logger.error('Database connection failed', { dbHost: 'localhost' });

*/