const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const path = require('path');
const { logger } = require('./winston'); 

// Create a rotating write stream
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',
  path: path.join(__dirname, '../logs'),
  size: '10M',
  compress: 'gzip',
  maxFiles: 14
});

// Custom token for response time in a more readable format
morgan.token('response-time-formatted', (req, res) => {
  const time = res.responseTime;
  if (time < 1000) return time + 'ms';
  return (time / 1000).toFixed(3) + 's';
});

// Custom token for client IP (considering proxies)
morgan.token('remote-addr', (req) => {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
});

// Custom format
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :response-time-formatted ":referrer" ":user-agent"';

// Create Morgan middleware with Winston integration
const morganMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Log using winston's info level instead of http
      logger.info(message.trim(), {
        type: 'access_log',
        component: 'morgan'
      });
    }
  },
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return req.url === '/health' && res.statusCode === 200;
    }
    return false;
  }
});

// Production logging to file
const morganFileLogger = morgan(morganFormat, {
  stream: accessLogStream,
  skip: (req, res) => {
    return req.url === '/health' && res.statusCode === 200;
  }
});

module.exports = {
  morganMiddleware,
  morganFileLogger
};