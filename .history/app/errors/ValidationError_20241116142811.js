class ValidationError extends AppError {
    constructor(message) {
        super(400, message);
        this.name = 'ValidationError';
        this.validationErrors = [];
    }

    addError(field, message) {
        this.validationErrors.push({ field, message });
    }
}