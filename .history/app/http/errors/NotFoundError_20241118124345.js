const {AppError} = require('./AppError');

class NotFoundError extends AppError {
    constructor(message = 'منبع مورد نظر یافت نشد') {
        super(404, message);
        this.name = 'NotFoundError';
    }
}

module.exports = {NotFoundError};
