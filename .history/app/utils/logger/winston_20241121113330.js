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
    level: 'error', // Change level to 'error' to capture errors
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
      level: 'info' // Capture info and higher levels in the console
    }),
    securityTransport,
    performanceTransport,
    customTransport,
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