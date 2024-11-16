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

// مدیریت خطاهای مختلف
const handleCastErrorDB = err => {
    return new AppError(400, `مقدار ${err.value} برای فیلد ${err.path} نامعتبر است`);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    return new AppError(400, `مقدار تکراری: ${value}. لطفاً از مقدار دیگری استفاده کنید`);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new AppError(400, `داده‌های نامعتبر: ${errors.join('. ')}`);
};

const handleReferenceError = err => {
    return new AppError(500, `خطای مرجع: ${err.message}`);
};

const handleSyntaxError = err => {
    return new AppError(400, `خطای نحوی: ${err.message}`);
};

const handleJWTError = () => new AppError(401, 'توکن نامعتبر است. لطفاً دوباره وارد شوید');
const handleJWTExpiredError = () => new AppError(401, 'توکن شما منقضی شده است. لطفاً دوباره وارد شوید');

// ارسال خطا در محیط توسعه
const sendErrorDev = (err, req, res) => {
    const trackingId = generateTrackingId();

    logger.error({
        trackingId,
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        requestBody: req.body,
        requestHeaders: req.headers,
        errorName: err.name
    });

    return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
        trackingId
    });
};

// ارسال خطا در محیط تولید
const sendErrorProd = (err, req, res) => {
    const trackingId = generateTrackingId();

    logger.error({
        trackingId,
        message: err.message,
        path: req.originalUrl,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
        errorName: err.name
    });

    //  خطاهای عملیاتی قابل اعتماد: ارسال پیام خطا به کلاینت
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            trackingId
        });
    }
    
    // خطاهای برنامه‌نویسی یا ناشناخته: عدم نشت جزییات خطا
    return res.status(500).json({
        status: 'error',
        message: 'متأسفانه خطایی رخ داده است',
        trackingId
    });
};

// میدلور اصلی مدیریت خطا
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // افزودن اطلاعات درخواست به خطا برای لاگ بهتر
    err.requestInfo = {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
    };

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        switch (error.name) {
            case 'CastError':
                error = handleCastErrorDB(error);
                break;
            case 'ValidationError':
                error = handleValidationErrorDB(error);
                break;
            case 'JsonWebTokenError':
                error = handleJWTError();
                break;
            case 'TokenExpiredError':
                error = handleJWTExpiredError();
                break;
            case 'ReferenceError':
                error = handleReferenceError(error);
                break;
            case 'SyntaxError':
                error = handleSyntaxError(error);
                break;
        }

        if (error.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }

        sendErrorProd(error, req, res);
    }
};

// میدلور برای خطاهای async/await با حفظ اطلاعات خطا
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(error => {
            // افزودن اطلاعات اضافی به خطا قبل از ارسال به error handler
            error.timestamp = new Date().toISOString();
            error.requestPath = req.originalUrl;
            next(error);
        });
    };
};

// تابع کمکی برای بررسی اعتبار ID‌ها
const validateId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

module.exports = {
    errorHandler,
    catchAsync,
    AppError,
    validateId
};