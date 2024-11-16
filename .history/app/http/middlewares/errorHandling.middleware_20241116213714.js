const AppError = require('../../errors/AppError');
const logger = require('../../utils/logger/winston');
const { v4: uuidv4 } = require('uuid');

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
const generateTrackingId = () => {
    return uuidv4();
};

// تابع کمکی برای ساخت متادیتای خطا
const buildErrorMetadata = (err, req, trackingId) => {
    return {
        trackingId,
        errorName: err.name,
        errorCode: err.code,
        statusCode: err.statusCode,
        path: req.originalUrl,
        method: req.method,
        requestId: req.id, // اگر از express-request-id استفاده می‌کنید
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id, // اگر سیستم احراز هویت دارید
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        requestBody: process.env.NODE_ENV === 'development' ? req.body : undefined,
        requestQuery: req.query,
        requestHeaders: process.env.NODE_ENV === 'development' ? req.headers : undefined
    };
};

// تابع کمکی برای لاگ کردن خطاها
const logError = (err, req, metadata) => {
    const errorLog = {
        ...metadata,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };

    // لاگ کردن خطاهای عملیاتی در سطح error
    if (err.isOperational) {
        logger.error('Operational Error', errorLog);
    } 
    // لاگ کردن خطاهای برنامه‌نویسی در سطح error با اولویت بالاتر
    else {
        logger.error('Programming Error', {
            ...errorLog,
            priority: 'high',
            needsImmediate: true
        });
    }
};

// هندلرهای خطاهای مختلف
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

// ارسال خطا در محیط توسعه
const sendErrorDev = (err, req, res, metadata) => {
    logError(err, req, metadata);

    return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
        trackingId: metadata.trackingId
    });
};

// ارسال خطا در محیط تولید
const sendErrorProd = (err, req, res, metadata) => {
    logError(err, req, metadata);

    // خطاهای عملیاتی قابل اعتماد: ارسال پیام خطا به کلاینت
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            trackingId: metadata.trackingId
        });
    }
    
    // خطاهای برنامه‌نویسی یا ناشناخته: عدم نشت جزییات خطا
    return res.status(500).json({
        status: 'error',
        message: 'متأسفانه خطایی رخ داده است',
        trackingId: metadata.trackingId
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
            case 'ReferenceError':
            case 'SyntaxError':
            case 'TypeError':
            case 'RangeError':
            case 'URIError':
                logger.error(`${error.name} occurred`, {
                    ...metadata,
                    stack: error.stack
                });
                break;
        }

        if (error.code === 11000) {
            error = handleDuplicateFieldsDB(error, metadata);
        }

        sendErrorProd(error, req, res, metadata);
    }
};

// میدلور برای خطاهای async/await با قابلیت لاگینگ
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(error => {
            const trackingId = generateTrackingId();
            logger.debug('Async Error Caught', {
                trackingId,
                path: req.originalUrl,
                method: req.method,
                errorMessage: error.message
            });
            next(error);
        });
    };
};

module.exports = {
    errorHandler,
    catchAsync,
    AppError
};