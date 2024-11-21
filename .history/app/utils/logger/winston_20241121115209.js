
const winston = require('winston');
require('winston-daily-rotate-file');

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, logType }) => {
  return `${timestamp} [${logType || 'general'}] ${level}: ${message}`;
});

// Create transports for different log types
const createLogTransport = (type) =>
  new transports.DailyRotateFile({
    filename: `logs/${type}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '10m',
    level: 'info', // Default level for all custom types
  });

// Transports for different log categories
const securityTransport = createLogTransport('security');
const performanceTransport = createLogTransport('performance');
const customTransport = createLogTransport('custom');

// Create the logger
const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(format.colorize(), logFormat),
    }),
    securityTransport,
    performanceTransport,
    customTransport,
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Enhanced methods for categorized logs
logger.security = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'security' });
};

logger.performance = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'performance' });
};

logger.custom = (message, metadata = {}) => {
  logger.info(message, { ...metadata, logType: 'custom' });
};

module.exports = { logger };
