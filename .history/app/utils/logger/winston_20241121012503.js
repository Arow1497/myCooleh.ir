const winston = require('winston');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
require('winston-daily-rotate-file');
require('source-map-support').install();

// Create logs directory structure
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_TYPES = ['error', 'system', 'general'];

const createLogDirectories = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  LOG_TYPES.forEach(type => {
    const typeDir = path.join(LOG_DIR, type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
  });
};

createLogDirectories();

// Define custom levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  system: 2
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  system: 'grey'
};

winston.addColors(colors);

// Get error location from stack trace
function getErrorLocation(error) {
  if (!error || !error.stack) return null;

  const stackLines = error.stack.split('\n');
  const relevantLine = stackLines.find(line => {
    return line.includes('at ') && 
           !line.includes('node_modules') && 
           !line.includes('winston.config.js');
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

// Custom format for detailed logging
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, metadata, error }) => {
    const errorLocation = error ? getErrorLocation(error) : null;
    const logObject = {
      timestamp,
      level,
      message,
      location: errorLocation,
      stack: stack || (error?.stack),
      metadata: metadata || {}
    };
    return JSON.stringify(logObject);
  })
);

// Configure transports
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'error', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  level: 'error',
  format: detailedFormat
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'general', 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  format: detailedFormat
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      let output = `${timestamp} ${level}: ${message}`;
      if (stack) {
        output += `\n${stack}`;
      }
      return output;
    })
  )
});

// Create logger instance
const logger = winston.createLogger({
  levels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: detailedFormat,
  transports: [
    errorFileTransport,
    combinedFileTransport,
    consoleTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'error', 'exceptions.log'),
      format: detailedFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'error', 'rejections.log'),
      format: detailedFormat
    })
  ],
  exitOnError: false
});

// Enhanced logging methods
logger.logError = function(err, metadata = {}) {
  const errorLocation = getErrorLocation(err);
  this.error(err.message, {
    error: err,
    errorLocation,
    metadata
  });
};

logger.system = function(message, metadata = {}) {
  this.info(message, { 
    metadata: { ...metadata, logType: 'system' }
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error,
    metadata: {
      type: 'uncaughtException',
      timestamp: moment().format()
    }
  });
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    error: reason,
    metadata: {
      type: 'unhandledRejection',
      timestamp: moment().format()
    }
  });
  process.exit(1);
});

module.exports = logger;