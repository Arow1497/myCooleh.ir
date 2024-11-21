const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const path = require('path');
const logger = require('./winston');

// Unified log directory
const LOG_DIR = path.join(__dirname, '../../logs/morganlogs');

// Create a rotating write stream for access logs
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',
  path: LOG_DIR,
  size: '10M',
  compress: 'gzip',
  maxFiles: 14
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

// Enhanced format with additional useful information
const morganFormat = [
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














// const winston = require('winston');
// const path = require('path');
// require('winston-daily-rotate-file');
// const Transport = require('winston-transport');
// require('source-map-support').install();
// const mongoose = require('mongoose');
// const moment = require('moment');
// const fs = require('fs');

// const LOG_DIR = path.join(__dirname, '../../logs');

// const createLogDirectories = () => {
//   const types = ['error', 'security', 'performance', 'system', 'custom'];
  
//   if (!fs.existsSync(LOG_DIR)) {
//     fs.mkdirSync(LOG_DIR, { recursive: true });
//   }
  
//   types.forEach(type => {
//     const typeDir = path.join(LOG_DIR, type);
//     if (!fs.existsSync(typeDir)) {
//       fs.mkdirSync(typeDir, { recursive: true });
//     }
//   });
// };

// createLogDirectories();

// const levels = {
//   error: 0,
//   warn: 1,
//   info: 2,
//   http: 3,
//   debug: 4,
//   security: 2,  
//   system: 2,    
//   performance: 2, 
//   custom: 2     
// };

// const colors = {
//   error: 'red',
//   warn: 'yellow',
//   info: 'green',
//   http: 'magenta',
//   debug: 'blue',
//   security: 'cyan',
//   system: 'grey',
//   performance: 'blue',
//   custom: 'green'
// };
// winston.addColors(colors);

// function getErrorLocation(error) {
//   if (!error || !error.stack) return null;

//   const stackLines = error.stack.split('\n');
//   const relevantLine = stackLines.find(line => {
//     return line.includes('at ') && 
//            !line.includes('node_modules') && 
//            !line.includes('winston.js') &&
//            !line.includes('/winston/') &&
//            !line.includes('errorHandling.middleware.js');
//   });

//   if (!relevantLine) return null;

//   const match = relevantLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
//   if (!match) return null;

//   const [_, functionName = 'anonymous', filePath, line, column] = match;
//   return {
//     function: functionName,
//     file: path.basename(filePath),
//     line,
//     column,
//     fullPath: filePath
//   };
// }

// const errorFormat = winston.format.printf(({ level, message, timestamp, stack, metadata, error, errorLocation, context }) => {
//   const logObject = {
//     timestamp,
//     level,
//     message,
//     context: context || {},
//     location: errorLocation || (error ? getErrorLocation(error) : null),
//     stack: stack || (error?.stack),
//     metadata: metadata || {},
//   };

//   return JSON.stringify(logObject);
// });

// const detailedFormat = winston.format.combine(
//   winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
//   winston.format.errors({ stack: true }),
//   winston.format.splat(),
//   winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack', 'error', 'errorLocation', 'context'] }),
//   errorFormat
// );

// const logSchema = new mongoose.Schema({
//   timestamp: Date,
//   level: String,
//   message: String,
//   context: Object,
//   location: Object,
//   metadata: Object,
//   stack: String,
// }, { timestamps: true });

// class EnhancedMongoTransport extends Transport {
//   constructor(opts) {
//     super(opts);
//     this.collection = mongoose.model('Log', opts.logSchema).collection;
//     this.levels = opts.levels || []; // سطوح مجاز برای ذخیره‌سازی
//   }

//   async log(info, callback) {
//     // بررسی سطح لاگ
//     if (this.levels.length > 0 && !this.levels.includes(info.level)) {
//       return callback(); // اگر سطح لاگ موردنظر نیست، عملیات را متوقف کنید
//     }

//     try {
//       await this.collection.insertOne({
//         timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
//         level: info.level,
//         message: info.message,
//         context: info.context || {},
//         location: info.errorLocation,
//         metadata: info.metadata || {},
//         stack: info.stack,
//       });
//       callback();
//     } catch (err) {
//       callback(err);
//     }
//   }
// }

// const getLogFileName = (type) => {
//   const date = moment().format('YYYY-MM-DD');
//   return path.join(LOG_DIR, type, `${type}-${date}.log`);
// };

// const createCustomFormat = (logType, section = null) => {
//   return winston.format((info) => {
//     if (logType === 'custom' && section) {
//       return info.metadata?.section === section ? info : false;
//     }
//     return info.metadata?.logType === logType ? info : false;
//   })();
// };



// // تنظیمات پایه برای همه لاگ‌ها
// const baseRotateConfig = {
//   datePattern: 'YYYY-MM-DD',
//   zippedArchive: true
// };

// // تعریف انواع لاگ‌ها و تنظیمات مخصوص هر کدام
// const logTypes = [
//   {
//     type: 'error',
//     maxSize: '20m',
//     maxFiles: '14d',
//     level: 'error'
//   },
//   {
//     type: 'security',
//     maxSize: '10m',
//     maxFiles: '30d',
//     level: 'info'
//   },
//   {
//     type: 'performance',
//     maxSize: '10m',
//     maxFiles: '7d',
//     level: 'info'
//   },
//   {
//     type: 'system',
//     maxSize: '10m',
//     maxFiles: '14d',
//     level: 'info'
//   },
//   {
//     type: 'custom',
//     maxSize: '10m',
//     maxFiles: '14d',
//     level: 'info'

//   },
// ];

// // ایجاد ترنسپورت‌ها براساس تنظیمات
// const fileTransports = logTypes.map(({ type, level, ...config }) => {
//   const formats = [detailedFormat];

//   // اضافه کردن فیلتر فقط برای لاگ‌های غیر عمومی
//   if (type !== 'error') {
//     formats.push(createCustomFormat(type));
//   }

//   return new winston.transports.DailyRotateFile({
//     filename: getLogFileName(type),
//     level: level || 'info', 
//     handleExceptions: true,
//     handleRejections: true,
//     format: winston.format.combine(...formats),
//     ...baseRotateConfig,
//     ...config
//   });
// });

// const formats = [detailedFormat];
// const generalTransport = new winston.transports.DailyRotateFile({
//   filename: getLogFileName('general'),
//   level: 'info',
//   format: winston.format.combine(...formats),
//   ...baseRotateConfig,
//   maxSize: '20m',
//   maxFiles: '14d',
// });

// // افزودن ترنسپورت عمومی به آرایه ترنسپورت‌ها
// fileTransports.push(generalTransport);

// // اضافه کردن ترنسپورت مونگو
// const mongoTransport = new EnhancedMongoTransport({
//   logSchema,
//   levels: ['info', 'error'], // سطوح موردنظر
//   handleExceptions: true,
//   handleRejections: true,
//   format: detailedFormat,
//   options: { 
//     useUnifiedTopology: true,
//     expireAfterSeconds: 14 * 24 * 60 * 60
//   }
// });

// const allTransports = [
//   ...fileTransports,
//   mongoTransport
// ];

// if (process.env.NODE_ENV === 'development') {
//   const consoleTransport = new winston.transports.Console({
//     format: winston.format.combine(
//       winston.format.colorize(),
//       winston.format.simple()
//     ),
//     handleExceptions: true, // هندل کردن استثناها در کنسول
//     handleRejections: true
//   });
//   allTransports.push(consoleTransport);
// }

// const logger = winston.createLogger({
//   level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//   levels,
//   defaultMeta: {
//     service: 'user-service',
//     environment: process.env.NODE_ENV,
//     version: process.env.APP_VERSION || '1.0.0',
//   },
//   transports: allTransports
// });


// // Log the number of transports
// console.log(`Number of transports: ${logger.transports.length}`);

// // Log the names of transports
// console.log('Transport names:');
// logger.transports.forEach((transport, index) => {
//   const transportName = transport.name || transport.constructor.name;
//   console.log(`- ${index + 1}: ${transportName}`);
// });


// // Enhanced logging methods
// logger.security = (message, metadata = {}) => {
//   logger.info(message, { ...metadata, logType: 'security' });
// };

// logger.performance = (message, metadata = {}) => {
//   logger.info(message, { ...metadata, logType: 'performance' });
// };

// logger.system = (message, metadata = {}) => {
//   logger.info(message, { ...metadata, logType: 'system' });
// };

// logger.custom = (message, metadata = {}) => {
//   logger.info(message, { ...metadata, logType: 'custom' });
// };

// logger.logError = function(err, metadata = {}, context = {}) {
//   const errorLocation = getErrorLocation(err);
//   this.error(err.message, {
//     error: err,
//     errorLocation,
//     context,
//     logType: 'error',
//     ...metadata
//   });
// };

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.combine(
//       winston.format.colorize({ all: true }),
//       winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
//       winston.format.printf(({ level, message, timestamp, context, metadata, logType, stack }) => {
//         let output = `${timestamp} [${logType || 'general'}] ${level}: ${message}`;
//         if (context && Object.keys(context).length) {
//           output += `\nContext: ${JSON.stringify(context, null, 2)}`;
//         }
//         if (metadata && Object.keys(metadata).length) {
//           output += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
//         }
//         if (stack) {
//           output += `\nStack Trace:\n${stack}`;
//         }
//         return output;
//       })
//     )
//   }));
// }

// module.exports = { logger };