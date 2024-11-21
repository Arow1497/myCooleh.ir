const winston = require('winston');
require('winston-daily-rotate-file');

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, logType, stack }) => {
  let logMessage = `${timestamp} [${logType || 'general'}] ${level}: ${message}`;
  if (stack) {
    logMessage += `\nStack Trace: ${stack}`;
  }
  return logMessage;
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
const errorTransport = createLogTransport('error');
const securityTransport = createLogTransport('security');
const performanceTransport = createLogTransport('performance');
const customTransport = createLogTransport('custom');

// Create the logger
const logger = createLogger({
  level: 'debug', // Default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(format.colorize(), logFormat),
    }),
    errorTransport,
    securityTransport,
    performanceTransport,
    customTransport,
  ],
});

// Enhanced methods for categorized logs
logger.logError = (err, metadata = {}, logType = 'error') => {
  logger.error(err.message, {
    ...metadata,
    logType,
    stack: err.stack,
  });
};

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
