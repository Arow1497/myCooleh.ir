const winston = require('winston');

// تعریف logger
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' }),
  ],
});

// بررسی تعداد transports
console.log(`Number of transports: ${logger.transports.length}`);
