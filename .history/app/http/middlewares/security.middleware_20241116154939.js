// افزودن هدرهای امنیتی به درخواست‌ها (مثلاً با Helmet).
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
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
    upgradeInsecureRequests: []
  }
};

// Security Middleware Function
const securityMiddleware = (app) => {
  // Basic Security Headers with Helmet
  app.use(helmet());
  
  // Content Security Policy
  app.use(helmet.contentSecurityPolicy(cspConfig));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Rate Limiting
  app.use('/api/', limiter);
  
  // Body Parser
  app.use(express.json({ limit: '10kb' })); // Limit body size
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  
  // Cookie Parser - Required for CSRF
  app.use(cookieParser());
  
  // Data Sanitization against NoSQL query injection
  app.use(mongoSanitize());
  
  // Data Sanitization against XSS
  app.use(xssClean());
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
  
  // CSRF Protection
  app.use(csrf({ cookie: true }));
  
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
  
  // Security Headers Middleware
  app.use((req, res, next) => {
    // Remove X-Powered-By
    res.removeHeader('X-Powered-By');
    
    // Strict Transport Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Prevent Clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // XSS Protection Header
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME Sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    
    // Feature Policy
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
    
    next();
  });
  
// Error Handler for Security Issues
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    });
  });
}