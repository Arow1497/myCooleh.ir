const { body, param, query } = require('express-validator');
const ExpressBrute = require('express-brute');

// Brute Force Protection Store
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

// Common Request Validation Rules
const commonValidationRules = {
    id: param('id').trim().escape().isInt(),
    email: body('email').isEmail().normalizeEmail(),
    password: body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
        .withMessage('Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, and one number'),
    name: body('name').trim().escape().isLength({ min: 2, max: 50 }),
    page: query('page').optional().isInt({ min: 1 }),
    limit: query('limit').optional().isInt({ min: 1, max: 100 })
};

// Basic Security Headers Middleware
const securityMiddleware = (req, res, next) => {
    // Remove X-Powered-By
    res.removeHeader('X-Powered-By');
    
    // Set Security Headers
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );

    // Set Cache Control for GET requests
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

module.exports = {
    securityMiddleware,
    commonValidationRules,
    bruteforce
};