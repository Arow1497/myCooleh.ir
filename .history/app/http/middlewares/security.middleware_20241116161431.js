const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const ExpressBrute = require('express-brute');
const slowDown = require('express-slow-down');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');
const { body, param, query, validationResult } = require('express-validator');

// Brute Force Protection
const store = new ExpressBrute.MemoryStore();
const bruteforce = new ExpressBrute(store, {
  freeRetries: 5,
  minWait: 5*60*1000, // 5 minutes
  maxWait: 60*60*1000, // 1 hour
  failCallback: function(req, res, next, nextValidRequestDate) {
    res.status(429).json({
      status: 'error',
      message: `Too many failed attempts. Please try again after ${nextValidRequestDate.toLocaleString()}`
    });
  }
});

// Speed Limiter
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request
});

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// CSP Configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: [],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    prefetchSrc: ["'self'"],
    baseUri: ["'self'"]
  }
};

// Sanitization Options
const sanitizeOptions = {
  allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
  allowedAttributes: {
    'a': [ 'href' ]
  }
};

// URL Validation
const validateUrl = (url) => {
  if (url.length > 2048) return false; // Max URL length
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true
  });
};

// Common Request Validation Rules
const commonValidationRules = {
  id: param('id').trim().escape().isInt(),
  email: body('email').isEmail().normalizeEmail(),
  password: body('password').isLength({ min: 8 }).matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/),
  name: body('name').trim().escape().isLength({ min: 2, max: 50 }),
  page: query('page').optional().isInt({ min: 1 }),
  limit: query('limit').optional().isInt({ min: 1, max: 100 })
};

// Security Middleware Function
const securityMiddleware = (app) => {
  // Basic Security Headers with Helmet
  app.use(helmet());
  
  // Content Security Policy
  app.use(helmet.contentSecurityPolicy(cspConfig));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Speed Limiter
  app.use(speedLimiter);
  
  // Rate Limiting
  app.use('/api/', limiter);
  
  // Body Parser with Size Limits
  app.use(express.json({ 
    limit: '10kb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch(e) {
        res.status(400).json({ status: 'error', message: 'Invalid JSON' });
        throw new Error('Invalid JSON');
      }
    }
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10kb',
    parameterLimit: 50 // Limit number of parameters
  }));
  
  // Cookie Parser with Security Options
  app.use(cookieParser(process.env.COOKIE_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }));
  
  // Data Sanitization against NoSQL query injection
  app.use(mongoSanitize());
  
  // Data Sanitization against XSS
  app.use(xssClean());
  
  // HTML Sanitizer Middleware
  app.use((req, res, next) => {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeHtml(req.body[key], sanitizeOptions);
        }
      });
    }
    next();
  });
  
  // URL Validation Middleware
  app.use((req, res, next) => {
    if (!validateUrl(req.originalUrl)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL format or length'
      });
    }
    next();
  });
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
  
  // CSRF Protection
  app.use(csrf({ cookie: true }));
  
  // Brute Force Protection for Login
  app.use('/api/auth/login', bruteforce.prevent);
  
  // Custom CSRF Error Handler
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid CSRF token'
      });
    }
    next(err);
  });
  
  // Request Validation Middleware
  app.use((req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  });
  
  // Security Headers Middleware
  app.use((req, res, next) => {
    // Remove X-Powered-By
    res.removeHeader('X-Powered-By');
    
    // Strict Transport Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Prevent Clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // XSS Protection Header
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME Sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );
    
    // Cache Control
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  });

  // Connection Limit Middleware
  let connections = 0;
  const MAX_CONNECTIONS = 1000;

  app.use((req, res, next) => {
    connections++;
    if (connections > MAX_CONNECTIONS) {
      res.status(503).json({
        status: 'error',
        message: 'Server is too busy. Please try again later.'
      });
      return;
    }
    res.on('finish', () => {
      connections--;
    });
    next();
  });
  
  // Error Handler for Security Issues
  app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Log security events but don't expose details
    if (err.name === 'SecurityError' || err.status === 403) {
      console.error(`Security Event: ${req.ip} - ${req.method} ${req.originalUrl}`);
    }
    
    res.status(err.status || 500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });
};

module.exports = {
  securityMiddleware,
  commonValidationRules,
  bruteforce
};