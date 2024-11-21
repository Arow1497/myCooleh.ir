const createHttpError = require('http-errors');
const logger = require('../config/winston.config');

const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
  });

  // Determine if error is operational or programming
  const isOperationalError = error instanceof createHttpError.HttpError;
  
  // Set default error
  const serverError = createHttpError.InternalServerError();
  const statusCode = isOperationalError ? error.status : serverError.status;
  const message = isOperationalError ? error.message : 'Internal Server Error';

  // Send response
  return res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

module.exports = errorHandler;