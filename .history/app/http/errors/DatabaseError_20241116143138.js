const AppError = require('./AppError');

class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(500, message, true);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

module.exports = DatabaseError;