const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const path = require('path');
const {logger} = require('./winston');

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