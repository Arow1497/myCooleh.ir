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
  security: 2,  
  system: 2,    
  performance: 2, 
  custom: 2     
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

const createCustomFormat = (logType, section = null) => {
  return winston.format((info) => {
    if (logType === 'custom' && section) {
      return info.metadata?.section === section ? info : false;
    }
    return info.metadata?.logType === logType ? info : false;
  })();
};



// تنظیمات پایه برای همه لاگ‌ها
const baseRotateConfig = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true
};

// تعریف انواع لاگ‌ها و تنظیمات مخصوص هر کدام
const logTypes = [
  {
    type: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error'
  },
  {
    type: 'security',
    maxSize: '10m',
    maxFiles: '30d'
  },
  {
    type: 'performance',
    maxSize: '10m',
    maxFiles: '7d'
  },
  {
    type: 'system',
    maxSize: '10m',
    maxFiles: '14d'
  },
  {
    type: 'custom',
    maxSize: '10m',
    maxFiles: '14d'
  },
  {
    type: 'general',
    maxSize: '20m',
    maxFiles: '14d'
  }
];

// ایجاد ترنسپورت‌ها براساس تنظیمات
const fileTransports = logTypes.map(({ type, ...config }) => {
  const formats = [detailedFormat];
  if (type !== 'general') {
    formats.push(createCustomFormat(type));
  }
  
  return new winston.transports.DailyRotateFile({
    filename: getLogFileName(type),
    format: winston.format.combine(...formats),
    ...baseRotateConfig,
    ...config
  });
});

// اضافه کردن ترنسپورت مونگو
const mongoTransport = new EnhancedMongoTransport({
  level: 'info',
  collection: 'application_logs',
  format: detailedFormat,
  options: { 
    useUnifiedTopology: true,
    expireAfterSeconds: 14 * 24 * 60 * 60
  }
});

const allTransports = [
  ...fileTransports,
  mongoTransport
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: allTransports
});

// Log the number of transports
// console.log(`Number of transports: ${logger.transports.length}`);

// Log the names of transports
// console.log('Transport names:');
// logger.transports.forEach((transport, index) => {
//   const transportName = transport.name || transport.constructor.name;
//   console.log(`- ${index + 1}: ${transportName}`);
// });

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
برای اینکه بتوانید تعداد پست‌های ایجاد شده در ۱۴ روز گذشته را شمارش کنید، 
باید لاگ‌هایتان را به گونه‌ای طراحی کنید که اطلاعات مورد نیاز شما
 (مانند **نوع عملیات**، **زمان ثبت**، و **کاربر ایجادکننده**)
 به صورت ساختاریافته ذخیره شوند. سپس می‌توانید با استفاده از ابزارهای تحلیل لاگ 
 (مانند **Loki**، **Elasticsearch**، یا حتی ابزارهای ساده‌تر) این اطلاعات را جستجو و پردازش کنید.

### گام‌های لازم برای شمارش پست‌های ایجاد شده:

---

#### 1. **ساختاردهی لاگ‌ها**
لاگ‌های مربوط به ایجاد پست باید شامل اطلاعات کلیدی زیر باشند:
- **نوع رویداد** (مثلاً: `post_created`)
- **زمان ثبت لاگ** (برای فیلتر کردن لاگ‌های ۱۴ روز گذشته)
- **شناسه کاربر** یا هر متادیتای دیگر.

نمونه کد برای ایجاد لاگ ساختاریافته:
```javascript
logger.custom('A post was created', {
  event: 'post_created',
  userId: 123, // شناسه کاربر
  postId: 456, // شناسه پست
  timestamp: new Date().toISOString(), // زمان ایجاد
});
```

---

#### 2. **ذخیره لاگ‌ها در یک سیستم تحلیل‌پذیر**
ابزارهایی که می‌توانید استفاده کنید:
- **Loki/Grafana:** برای ذخیره و جستجوی لاگ‌ها.
- **Elasticsearch/Kibana:** برای تحلیل پیشرفته‌تر.
- **یک پایگاه داده ساده:** می‌توانید لاگ‌ها را مستقیماً در دیتابیسی مانند MongoDB ذخیره کنید.

---

#### 3. **پرس‌وجو از لاگ‌ها**
- در **Loki** یا **Elasticsearch** می‌توانید لاگ‌هایی با `event: "post_created"` را در بازه زمانی مشخص جستجو کنید.
- نمونه کوئری Loki:
  ```plaintext
  {event="post_created"} |= "post_created" | json | duration(14d)
  ```
  این کوئری تمامی لاگ‌های `post_created` را در ۱۴ روز گذشته فیلتر می‌کند.

---

#### 4. **استفاده از اسکریپت برای شمارش لاگ‌ها**
اگر می‌خواهید به صورت برنامه‌نویسی
 داده‌ها را پردازش کنید، می‌توانید لاگ‌ها را به صورت فایل یا از طریق API لاگ‌سرور پردازش کنید.

نمونه کد برای خواندن لاگ‌ها و شمارش با استفاده از فایل‌های JSON:
```javascript
const fs = require('fs');
const path = require('path');

// مسیر فایل لاگ
const logFilePath = path.join(__dirname, 'logs/custom.log');

// زمان شروع ۱۴ روز قبل
const fourteenDaysAgo = new Date();
fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

// خواندن فایل لاگ
fs.readFile(logFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading log file:', err);
    return;
  }

  // پردازش لاگ‌ها
  const logs = data.split('\n').filter(line => line.trim() !== ''); // حذف خطوط خالی
  const postCreatedLogs = logs.filter(log => {
    try {
      const logData = JSON.parse(log);
      return logData.event === 'post_created' && new Date(logData.timestamp) > fourteenDaysAgo;
    } catch (e) {
      return false;
    }
  });

  console.log(`Number of posts created in the last 14 days: ${postCreatedLogs.length}`);
});
```

---

#### 5. **هشدار و مانیتورینگ**
برای اینکه نیازی به اجرای دستی اسکریپت نداشته باشید:
- می‌توانید یک **کرون‌جاب** تنظیم کنید که این اسکریپت را روزانه اجرا کند.
- یا از ابزارهایی مانند **Grafana Alerts** استفاده کنید تا گزارش‌ها یا هشدارها را خودکار ارسال کند.

---

### جمع‌بندی:
1. لاگ‌های مربوط به ایجاد پست را به صورت ساختاریافته ثبت کنید.
2. لاگ‌ها را در ابزار تحلیل مناسب ذخیره کنید (Loki یا Elasticsearch توصیه می‌شود).
3. با استفاده از کوئری یا اسکریپت، تعداد لاگ‌ها را در بازه زمانی مشخص شمارش کنید.
4. گزارش‌ها را به صورت خودکار تنظیم کنید تا به صورت دوره‌ای ایجاد شوند.

*/
