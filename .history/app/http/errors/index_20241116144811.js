const AppError = require('./AppError');
const ValidationError = require('./ValidationError');
const AuthError = require('./AuthError');
const DatabaseError = require('./DatabaseError');
const NotFoundError = require('./NotFoundError');
const RateLimitError = require('./RateLimitError');

module.exports = {
    AppError,
    ValidationError,
    AuthError,
    DatabaseError,
    NotFoundError,
    RateLimitError
};