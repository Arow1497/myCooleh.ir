// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const {RedisStore} = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../../utils/logger/winston'); 
const { RateLimitError } = require('../errors/RateLimitError'); // کلاس خطای سفارشی


const isAdminRequest = (req) => {
    const adminIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    return adminIPs.some(ip => req.ip.includes(ip));
};

// تنظیمات Redis با قابلیت retry
const redisClient = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 30
});

// مانیتورینگ وضعیت Redis
redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    // logger.info('Redis Client Connected');
});

// تنظیمات مختلف برای محیط‌های مختلف
const getRateLimitConfig = () => {
    switch(process.env.NODE_ENV) {
        case 'production':
            return { windowMs: 60000, max: 30 }; // 5 requests per minute
        case 'staging':
            return { windowMs: 60000, max: 30 }; // 10 requests per minute
        default:
            return { windowMs: 60000, max: 30 }; // 30 requests per minute for development
    }
};

// Rate limiter برای API های عمومی
const generalRateLimiter = rateLimit({
   
    ...getRateLimitConfig(),
    handler: (req, res) => {
        throw new RateLimitError('تعداد درخواست‌های شما از حد مجاز بیشتر شده است.');
    },
    keyGenerator: (req) => {
        // ترکیبی از IP و User-Agent برای شناسایی بهتر
        return `${req.ip}-${req.headers['user-agent']}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter سختگیرانه‌تر برای مسیرهای حساس مثل لاگین
const authRateLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:auth:',
    }),
    windowMs: process.env.NODE_ENV === 'development' ? Infinity : 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? Infinity : 30,
    handler: (req, res, next) => {
        const retryAfter = Math.ceil(15 * 60); // 15 دقیقه به ثانیه
        const error = new RateLimitError('محدودیت تعداد تلاش‌های ورود به سیستم', {
            retryAfter,
            limit: 30,
            windowMs: 15 * 60 * 1000,
            remaining: 0,
            resetTime: new Date(Date.now() + (15 * 60 * 1000))
        });
        next(error);
    }
});

// کلاس مدیریت فعالیت‌های مشکوک
class SuspiciousActivityDetector {
    constructor() {
        this.requests = new Map();
        this.blacklist = new Set();
        this.WINDOW_SIZE = 30 * 1000; // 30 ثانیه
        this.REQUEST_LIMIT = 10;
        this.BLOCK_DURATION = 3600; // 1 ساعت
    }

    async isBlacklisted(identifier) {
        return await redisClient.get(`blacklist:${identifier}`);
    }

    async addToBlacklist(identifier) {
        await redisClient.setex(
            `blacklist:${identifier}`, 
            this.BLOCK_DURATION,
            JSON.stringify({
                timestamp: Date.now(),
                reason: 'Suspicious Activity'
            })
        );
    }

    async checkActivity(req) {
        const identifier = this.getIdentifier(req);
        
        // بررسی blacklist
        if (await this.isBlacklisted(identifier)) {
            return false;
        }

        const now = Date.now();
        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }

        const userRequests = this.requests.get(identifier);
        userRequests.push(now);

        // حذف درخواست‌های قدیمی
        const recentRequests = userRequests.filter(
            time => (now - time) < this.WINDOW_SIZE
        );
        this.requests.set(identifier, recentRequests);

        // بررسی تعداد درخواست‌ها
        if (recentRequests.length >= this.REQUEST_LIMIT) {
            await this.addToBlacklist(identifier);
            logger.warn(`Suspicious activity detected: ${identifier}`);
            return false;
        }

        return true;
    }

    getIdentifier(req) {
        // ترکیب چند فاکتور برای شناسایی دقیق‌تر
        return `${req.ip}-${req.headers['user-agent']}-${req.headers['accept-language']}`;
    }
}

const suspiciousDetector = new SuspiciousActivityDetector();

// Middleware اصلی برای بررسی فعالیت‌های مشکوک
const checkSuspiciousActivity = async (req, res, next) => {
    if (isAdminRequest(req)) {
        return next(); // عبور بدون محدودیت برای ادمین
    }
    
    try {
        const isAllowed = await suspiciousDetector.checkActivity(req);
        if (!isAllowed) {
            throw new RateLimitError('فعالیت مشکوک شناسایی شده است.');
        }
        next();
    } catch (error) {
        next(error);
    }
};

// Middleware برای مسیرهای حساس با محدودیت‌های خاص
const sensitivePathLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:sensitive:',
    }),
    windowMs: process.env.NODE_ENV === 'development' ? Infinity : 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? Infinity : 30,
    handler: (req, res) => {
        throw new RateLimitError('دسترسی به این مسیر محدود شده است. لطفاً بعداً تلاش کنید.');
    }
});

// تابع کمکی برای پاکسازی دوره‌ای blacklist
const cleanupBlacklist = async () => {
    const keys = await redisClient.keys('blacklist:*');
    for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
            const { timestamp } = JSON.parse(data);
            if (Date.now() - timestamp > 24 * 60 * 60 * 1000) { // 24 ساعت
                await redisClient.del(key);
            }
        }
    }
};

// اجرای پاکسازی هر 6 ساعت
setInterval(cleanupBlacklist, 6 * 60 * 60 * 1000);

module.exports = {
    generalRateLimiter,
    authRateLimiter,
    sensitivePathLimiter,
    checkSuspiciousActivity,
};