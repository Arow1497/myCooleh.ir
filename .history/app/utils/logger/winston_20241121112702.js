const winston = require('winston');
require('winston-daily-rotate-file');

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Transport for daily rotate file (error logs)
const errorFileTransport = new transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  level: 'error',
});

// Create the logger
const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Include stack traces
    logFormat
  ),
  transports: [
    errorFileTransport, // Save error logs to file
    new transports.Console({ // Print all logs to console
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

module.exports = { logger };
