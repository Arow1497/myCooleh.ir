const AppError = require('../errors/AppError');
const { logger } = require('../../utils/logger/winston');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// پیام‌های خطای سفارشی
const errorMessages = {
  ValidationError: 'داده‌های ورودی نامعتبر هستند',
  CastError: 'فرمت داده نامعتبر است',
  JsonWebTokenError: 'توکن نامعتبر است',
  TokenExpiredError: 'توکن منقضی شده است',
  ReferenceError: 'خطای مرجع - متغیر یا تابع تعریف نشده است',
  SyntaxError: 'خطای نحوی در کد',
  TypeError: 'خطای نوع داده',
  RangeError: 'خطای محدوده',
  URIError: 'خطا در کدگذاری یا رمزگشایی URI',
};

// تابع کمکی برای ایجاد شناسه ردیابی
const generateTrackingId = () => uuidv4();

// تابع کمکی برای ساخت متادیتای خطا
const buildErrorMetadata = (err, req, trackingId) => ({
  trackingId,
  errorName: err.name,
  errorCode: err.code,
  statusCode: err.statusCode,
  path: req?.originalUrl,
  method: req?.method,
  requestId: req?.id,
  ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress,
  userAgent: req?.get('user-agent'),
  userId: req?.user?.id,
  timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
  environment: process.env.NODE_ENV,
  requestBody: process.env.NODE_ENV === 'development' ? req?.body : undefined,
  requestQuery: req?.query,
  requestHeaders: process.env.NODE_ENV === 'development' ? req?.headers : undefined
});

// تابع کمکی برای لاگ کردن خطاها
const logError = (err, req = {}, metadata = {}) => {
  const errorData = {
    ...metadata,
    errorName: err.name,
    errorMessage: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  logger.error('Application Error', errorData);
};

// مدیریت خطاهای runtime
process.on('uncaughtException', (err) => {
  const trackingId = generateTrackingId();
  const metadata = {
    trackingId,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
    environment: process.env.NODE_ENV
  };

  logger.error('Uncaught Exception', metadata);
  console.error('Uncaught Exception:', err);
  process.exit(1); // به‌صورت امن فرآیند را ری‌استارت کنید
});

process.on('unhandledRejection', (reason, promise) => {
  const trackingId = generateTrackingId();
  const metadata = {
    trackingId,
    reason: reason?.message || reason,
    stack: reason?.stack || null,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
    environment: process.env.NODE_ENV
  };

  logger.error('Unhandled Rejection', metadata);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ارسال خطا در محیط توسعه
const sendErrorDev = (err, req, res, metadata) => {
  logError(err, req, metadata);
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    trackingId: metadata.trackingId,
    requestBody: req.body, // ثبت بدنه درخواست برای دیباگ
    requestHeaders: req.headers
  });
};

// ارسال خطا در محیط تولید
const sendErrorProd = (err, req, res, metadata) => {
  logError(err, req, metadata);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      trackingId: metadata.trackingId
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'متأسفانه خطایی رخ داده است',
    trackingId: metadata.trackingId
  });
};

// مدیریت خطاهای دیتابیس و توکن
const handleCastErrorDB = (err, metadata) => {
  const message = `مقدار ${err.value} برای فیلد ${err.path} نامعتبر است`;
  logger.warn('Database Cast Error', { ...metadata, details: err.reason });
  return new AppError(400, message);
};

const handleDuplicateFieldsDB = (err, metadata) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `مقدار تکراری: ${value}. لطفاً از مقدار دیگری استفاده کنید`;
  logger.warn('Database Duplicate Key Error', { ...metadata, duplicateKey: value });
  return new AppError(400, message);
};

const handleValidationErrorDB = (err, metadata) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `داده‌های نامعتبر: ${errors.join('. ')}`;
  logger.warn('Database Validation Error', { ...metadata, validationErrors: errors });
  return new AppError(400, message);
};

const handleJWTError = metadata => {
  logger.warn('JWT Validation Error', metadata);
  return new AppError(401, 'توکن نامعتبر است. لطفاً دوباره وارد شوید');
};

const handleJWTExpiredError = metadata => {
  logger.warn('JWT Expiration Error', metadata);
  return new AppError(401, 'توکن شما منقضی شده است. لطفاً دوباره وارد شوید');
};

const handleUncaughtException = async (err) => {
  const trackingId = uuidv4();
  const metadata = {
      trackingId,
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
      environment: process.env.NODE_ENV,
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      logType: 'error',
      severity: 'CRITICAL'
  };

  return new Promise((resolve) => {
      // ثبت خطا در لاگ
      logger.error('Uncaught Exception', metadata);

      // صبر برای تکمیل عملیات لاگینگ
      logger.on('finish', () => {
          console.error('Uncaught Exception:', err);
          resolve();
      });

      // تنظیم timeout برای جلوگیری از hanging
      setTimeout(() => {
          resolve();
      }, 2000);
  }).finally(() => {
      // خروج از برنامه بعد از ثبت لاگ
      process.exit(1);
  });
};

const handleUnhandledRejection = async (reason, promise) => {
  const trackingId = uuidv4();
  const metadata = {
      trackingId,
      reason: reason?.message || reason,
      stack: reason?.stack,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
      environment: process.env.NODE_ENV,
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      logType: 'error',
      severity: 'HIGH',
      promise: promise ? {
          state: promise.state?.(),
          stack: promise.stack
      } : undefined
  };

  return new Promise((resolve) => {
      // ثبت خطا در لاگ
      logger.error('Unhandled Rejection', metadata);

      // صبر برای تکمیل عملیات لاگینگ
      logger.on('finish', () => {
          console.error('Unhandled Rejection at:', promise, 'reason:', reason);
          resolve();
      });

      // تنظیم timeout برای جلوگیری از hanging
      setTimeout(() => {
          resolve();
      }, 2000);
  });
};
// میدلور اصلی مدیریت خطا
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const trackingId = generateTrackingId();
  const metadata = buildErrorMetadata(err, req, trackingId);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res, metadata);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.stack = err.stack;

    switch (error.name) {
      case 'CastError':
        error = handleCastErrorDB(error, metadata);
        break;
      case 'ValidationError':
        error = handleValidationErrorDB(error, metadata);
        break;
      case 'JsonWebTokenError':
        error = handleJWTError(metadata);
        break;
      case 'TokenExpiredError':
        error = handleJWTExpiredError(metadata);
        break;
      default:
        if (error.code === 11000) {
          error = handleDuplicateFieldsDB(error, metadata);
        }
        break;
    }

    sendErrorProd(error, req, res, metadata);
  }
};

// میدلور برای خطاهای async/await
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(error => {
      const trackingId = generateTrackingId();
      const metadata = buildErrorMetadata(error, req, trackingId);
      logError(error, req, metadata);
      next(error);
    });
  };
};

module.exports = {
  errorHandler,
  catchAsync,
  AppError,
  handleUncaughtException,
  handleUnhandledRejection
};



/*
این میدلور خطا به صورت خودکار تمام خطاهای برنامه را مدیریت و لاگ می‌کند،
 اما همچنان موارد زیر را باید به صورت دستی لاگ کنید:

رویدادهای کسب و کار مهم:

مثال: ثبت‌نام کاربر جدید
logger.info('New user registered', {
    userId: user.id,
    email: user.email,
    registrationDate: new Date()
});
تغییرات حساس:

مثال: تغییر وضعیت سفارش
logger.info('Order status changed', {
    orderId: order.id,
    oldStatus: oldStatus,
    newStatus: newStatus,
    changedBy: userId
});
عملیات‌های امنیتی:

مثال: تلاش‌های ورود ناموفق
logger.warn('Failed login attempt', {
    ip: req.ip,
    email: req.body.email,
    attempt: loginAttempts
});
برای روشن‌تر شدن موضوع، بیایید یک مثال کامل ببینیم:


Logging Best Practices Example
Click to open code
راهنمای کلی برای اینکه چه چیزهایی را باید لاگ کنیم:

خطاها (Errors):
✅ خودکار توسط errorHandler مدیریت می‌شوند
❌ نیازی به لاگ دستی نیست
رویدادهای کسب و کار (Business Events):
✅ باید دستی لاگ شوند
مثال: تغییر وضعیت سفارش، ثبت‌نام کاربر، انجام تراکنش
رویدادهای امنیتی (Security Events):
✅ باید دستی لاگ شوند
مثال: ورود/خروج کاربر، تغییر رمز عبور، تلاش‌های ناموفق
تغییرات حساس (Critical Changes):
✅ باید دستی لاگ شوند
مثال: تغییر در تنظیمات سیستم، حذف داده‌های مهم
اطلاعات Debug:
⚠️ اختیاری، بسته به نیاز پروژه
فقط در محیط توسعه نمایش داده می‌شوند
نکات مهم:

از سطوح مناسب لاگ استفاده کنید:
error: برای خطاهای جدی (اکثراً توسط errorHandler)
warn: برای هشدارها و موارد غیرعادی
info: برای رویدادهای مهم کسب و کار
debug: برای اطلاعات اضافی در محیط توسعه
http: برای درخواست‌های HTTP (توسط morgan)
همیشه متادیتای مفید اضافه کنید:
شناسه‌های مرتبط (userId, orderId, etc.)
زمان دقیق
اطلاعات عامل تغییر (کاربر یا سیستم)
از لاگ کردن اطلاعات حساس خودداری کنید:
رمزهای عبور
توکن‌های امنیتی
اطلاعات کارت اعتباری

controllers/orderController.js
*/

                 //EXAMPLES EXAMPLES EXAMPLES//
                 /*
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger/winston');

const updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { newStatus } = req.body;

    // 1. لاگ شروع عملیات - اختیاری، برای debug
    logger.debug('Updating order status', {
        orderId,
        newStatus,
        requestedBy: req.user.id
    });

    const order = await Order.findById(orderId);
    
    // 2. بررسی خطا - نیازی به لاگ نیست، توسط errorHandler مدیریت می‌شود
    if (!order) {
        throw new AppError(404, 'سفارش یافت نشد');
    }

    const oldStatus = order.status;
    order.status = newStatus;
    await order.save();

    // 3. لاگ تغییر مهم کسب و کار - باید ثبت شود
    logger.info('Order status updated successfully', {
        orderId,
        oldStatus,
        newStatus,
        updatedBy: req.user.id,
        updatedAt: new Date(),
        customerEmail: order.customerEmail
    });

    // 4. اگر تغییر حساس باشد - باید ثبت شود
    if (newStatus === 'cancelled') {
        logger.warn('Order cancelled', {
            orderId,
            reason: req.body.reason,
            cancelledBy: req.user.id,
            orderValue: order.totalAmount
        });
    }

    return res.status(200).json({
        status: 'success',
        data: order
    });
});

// مثال دیگر - سرویس احراز هویت
const loginUser = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // 1. لاگ تلاش ورود - مهم برای امنیت
    logger.debug('Login attempt', {
        email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    const user = await User.findOne({ email });
    
    // 2. خطای نادرست بودن ایمیل - توسط errorHandler مدیریت می‌شود
    if (!user) {
        throw new AppError(401, 'ایمیل یا رمز عبور نادرست است');
    }

    const isPasswordCorrect = await user.comparePassword(password);
    
    // 3. لاگ ورود ناموفق - مهم برای امنیت
    if (!isPasswordCorrect) {
        logger.warn('Failed login attempt', {
            email,
            ip: req.ip,
            reason: 'Invalid password',
            attemptCount: user.loginAttempts + 1
        });
        
        throw new AppError(401, 'ایمیل یا رمز عبور نادرست است');
    }

    // 4. لاگ ورود موفق - مهم برای audit
    logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        loginTime: new Date()
    });

    const token = generateToken(user);
    return res.status(200).json({
        status: 'success',
        token
    });
});
                 //EXAMPLES EXAMPLES EXAMPLES//
                 */