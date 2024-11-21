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


const createCustomFormat = (logType) => {
  return winston.format((info) => {
    // بررسی وجود logType و تطابق آن با مقدار مورد انتظار
    if (info.metadata && info.metadata.logType === logType) {
      return info;
    }
    return false; // لاگ فیلتر شود اگر نوع لاگ مطابقت ندارد
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

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [...fileTransports, mongoTransport],
});
// افزودن exceptionHandlers
logger.exceptions.handle(
  new winston.transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') })
);

// افزودن rejectionHandlers
logger.rejections.handle(
  new winston.transports.File({ filename: path.join(LOG_DIR, 'rejections.log') })
);


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