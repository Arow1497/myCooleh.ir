

const winston = require('winston');
require('winston-daily-rotate-file');

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, logType }) => {
  return `${timestamp} [${logType || 'general'}] ${level}: ${message}`;
});

// Create the logger
const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.DailyRotateFile({
      filename: `logs/security-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '10m',
      level: 'info'
    }),
    new transports.DailyRotateFile({
      filename: `logs/performance-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '10m',
      level: 'info'
    }),
    new transports.DailyRotateFile({
      filename: `logs/custom-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '10m',
      level: 'info'
    }),
    new transports.DailyRotateFile({
      filename: `logs/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '10m',
      level: 'error'
    }),
    new transports.Console({
      format: combine(format.colorize(), logFormat),
    }),
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

// Add a method to log errors specifically
logger.error = (message, metadata = {}) => {
  logger.error(message, { ...metadata, logType: 'error' });
};

module.exports = { logger };