const createHttpError = require('http-errors');
const logger = require('../../utils/logger/winston');

const errorHandler = (error, req, res, next) => {
  // Log the error with enhanced details
  logger.logError(error, {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
    timestamp: new Date().toISOString()
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

module.exports = errorHandler;