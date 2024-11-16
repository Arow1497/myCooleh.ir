const AppError = require('../../errors/AppError');
const logger = require('../../utils/logger/winston');

// پیام‌های خطای سفارشی
const errorMessages = {
    ValidationError: 'داده‌های ورودی نامعتبر هستند',
    CastError: 'فرمت داده نامعتبر است',
    JsonWebTokenError: 'توکن نامعتبر است',
    TokenExpiredError: 'توکن منقضی شده است',
};

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

const handleJWTError = () => new AppError(401, 'توکن نامعتبر است. لطفاً دوباره وارد شوید');
const handleJWTExpiredError = () => new AppError(401, 'توکن شما منقضی شده است. لطفاً دوباره وارد شوید');

const sendErrorDev = (err, req, res) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.originalUrl
    });

    return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, req, res) => {
    logger.error({
        message: err.message,
        path: req.originalUrl,
        statusCode: err.statusCode
    });

    // خطاهای عملیاتی قابل اعتماد: ارسال پیام به کلاینت
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }
    
    // خطاهای برنامه‌نویسی یا ناشناخته: عدم نشت جزئیات خطا
    return res.status(500).json({
        status: 'error',
        message: 'متأسفانه خطایی رخ داده است'
    });
};

// میدلور اصلی مدیریت خطا
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};


// میدلور برای خطاهای async/await
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = {
    errorHandler,
    catchAsync,
    AppError
};