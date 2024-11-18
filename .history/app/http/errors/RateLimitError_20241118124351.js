const {AppError} = require('./AppError');

class RateLimitError extends AppError {
    constructor(message = 'تعداد تلاش‌های ورود از حد مجاز بیشتر شده است. لطفاً 15 دقیقه صبر کنید.', metadata = {}) {
        super(429, message); // 429 Too Many Requests
        this.name = 'RateLimitError';
        this.isOperational = true;
        this.metadata = {
            retryAfter: metadata.retryAfter || null,
            limit: metadata.limit || null,
            windowMs: metadata.windowMs || null,
            remaining: metadata.remaining || 0,
            resetTime: metadata.resetTime || null,
            ...metadata
        };
    }

    getRetryAfterSeconds() {
        return this.metadata.retryAfter;
    }

    toJSON() {
        return {
            status: 'error',
            statusCode: this.statusCode,
            message: this.message,
            retryAfter: this.metadata.retryAfter,
            resetTime: this.metadata.resetTime,
            limit: this.metadata.limit,
            remaining: this.metadata.remaining
        };
    }
}

module.exports = {RateLimitError};