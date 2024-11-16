const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// تنظیمات Redis
const redisClient = new Redis({
  host: '127.0.0.1',
  port: 6379,
});

// Middleware برای محدود کردن ۵ درخواست در دقیقه
const generalRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // ۱ دقیقه
  max: 5, // حداکثر ۵ درخواست
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// شناسایی فعالیت‌های مشکوک
const suspiciousRequests = new Map(); // نگهداری تاریخچه درخواست‌ها برای هر کاربر

const checkSuspiciousActivity = (req, res, next) => {
  const userIP = req.ip; // استفاده از IP کاربر برای شناسایی
  const currentTime = Date.now();

  if (!suspiciousRequests.has(userIP)) {
    suspiciousRequests.set(userIP, []);
  }

  const timestamps = suspiciousRequests.get(userIP);
  timestamps.push(currentTime);

  // نگه‌داشتن فقط درخواست‌های اخیر (۳۰ ثانیه)
  suspiciousRequests.set(
    userIP,
    timestamps.filter((timestamp) => currentTime - timestamp < 30 * 1000)
  );

  // بررسی اگر تعداد درخواست‌ها ۱۰ یا بیشتر باشد
  if (timestamps.length >= 10) {
    redisClient.setex(`block:${userIP}`, 3600, 'BLOCKED'); // مسدود کردن IP برای ۱ ساعت
    console.warn(`Suspicious activity detected from IP: ${userIP}`); // پیام هشدار در لاگ‌ها

    return res.status(429).json({
      message:
        'Your activity has been flagged as suspicious. Please try again later.',
    });
  }

  next();
};

// Middleware برای بررسی بلاک‌شدن کاربر
const checkBlockedUsers = async (req, res, next) => {
  const userIP = req.ip;

  const isBlocked = await redisClient.get(`block:${userIP}`);
  if (isBlocked) {
    return res.status(429).json({
      message: 'You are temporarily blocked due to suspicious activity.',
    });
  }

  next();
};

module.exports = {
  generalRateLimiter,
  checkSuspiciousActivity,
  checkBlockedUsers,
};
