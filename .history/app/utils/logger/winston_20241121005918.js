const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;
require('winston-daily-rotate-file');

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Transport for daily rotate file
const fileRotateTransport = new transports.DailyRotateFile({
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
    format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport for all levels
    new transports.Console({
      format: combine(colorize(), logFormat)
    }),
    // File transport for errors
    fileRotateTransport,
    // Separate file for all logs
    new transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
    })
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});

module.exports = logger;