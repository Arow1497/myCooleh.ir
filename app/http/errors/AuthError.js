const AppError = require('./AppError');

class AuthError extends AppError {
    constructor(message) {
        super(401, message);
        this.name = 'AuthError';
    }
}

module.exports = AuthError;
