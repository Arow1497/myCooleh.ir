const AppError = require('../errors/AppError');
const { logger } = require('../../utils/logger/winston');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// ...

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
    error.stack = err.stack; // Preserve the original stack trace

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

    // لاگ کردن خطاهای غیر عملیاتی
    if (!error.isOperational) {
      logger.logError(error, {
        ...metadata,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }

    sendErrorProd(error, req, res, metadata);
  }
};

// ...
