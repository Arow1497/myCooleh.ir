const Joi = require('joi');

const publicValidators = {
    // ID Validators
    id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'شناسه باید عدد باشد',
            'number.integer': 'شناسه باید عدد صحیح باشد',
            'number.positive': 'شناسه باید مثبت باشد',
            'any.required': 'شناسه الزامی است'
        }),

    uuid: Joi.string().uuid()
        .messages({
            'string.guid': 'فرمت UUID نامعتبر است'
        }),

    // String Validators
    title: Joi.string().min(2).max(100).trim()
        .messages({
            'string.base': 'عنوان باید متن باشد',
            'string.min': 'عنوان باید حداقل ۲ کاراکتر باشد',
            'string.max': 'عنوان نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد'
        }),

    description: Joi.string().min(10).max(1000).trim()
        .messages({
            'string.base': 'توضیحات باید متن باشد',
            'string.min': 'توضیحات باید حداقل ۱۰ کاراکتر باشد',
            'string.max': 'توضیحات نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد'
        }),

    // Contact Validators
    email: Joi.string().email()
        .messages({
            'string.email': 'ایمیل نامعتبر است'
        }),

    phone: Joi.string().pattern(/^09[0-9]{9}$/)
        .messages({
            'string.pattern.base': 'شماره موبایل نامعتبر است'
        }),

    // Date Validators
    date: Joi.date().iso()
        .messages({
            'date.base': 'تاریخ نامعتبر است',
            'date.format': 'فرمت تاریخ باید ISO باشد'
        }),

    // Pagination Validators
    page: Joi.number().integer().min(1).default(1)
        .messages({
            'number.base': 'شماره صفحه باید عدد باشد',
            'number.min': 'شماره صفحه باید بزرگتر از صفر باشد'
        }),

    limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
            'number.base': 'تعداد آیتم در هر صفحه باید عدد باشد',
            'number.min': 'تعداد آیتم در هر صفحه باید حداقل ۱ باشد',
            'number.max': 'تعداد آیتم در هر صفحه نمی‌تواند بیشتر از ۱۰۰ باشد'
        }),

    // Status Validators
    status: Joi.string().valid('active', 'inactive', 'pending', 'deleted')
        .messages({
            'any.only': 'وضعیت نامعتبر است'
        }),

    // Search Validators
    search: Joi.string().min(2).max(50).trim()
        .messages({
            'string.min': 'عبارت جستجو باید حداقل ۲ کاراکتر باشد',
            'string.max': 'عبارت جستجو نمی‌تواند بیشتر از ۵۰ کاراکتر باشد'
        }),

    // Sort Validators
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'id')
        .messages({
            'any.only': 'فیلد مرتب‌سازی نامعتبر است'
        }),

    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
        .messages({
            'any.only': 'ترتیب مرتب‌سازی نامعتبر است'
        }),

    // Common Array Validators
    ids: Joi.array().items(Joi.number().integer().positive())
        .messages({
            'array.base': 'فرمت آرایه نامعتبر است',
            'number.base': 'شناسه‌ها باید عدد باشند',
            'number.integer': 'شناسه‌ها باید عدد صحیح باشند',
            'number.positive': 'شناسه‌ها باید مثبت باشند'
        }),

    // Boolean Validators
    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'مقدار باید boolean باشد'
        }),

    // Price Validators
    price: Joi.number().min(0).precision(2)
        .messages({
            'number.base': 'قیمت باید عدد باشد',
            'number.min': 'قیمت نمی‌تواند منفی باشد',
            'number.precision': 'قیمت می‌تواند حداکثر دو رقم اعشار داشته باشد'
        }),

    // File Validators
    fileSize: Joi.number().max(5 * 1024 * 1024) // 5MB
        .messages({
            'number.max': 'حجم فایل نمی‌تواند بیشتر از ۵ مگابایت باشد'
        }),

    fileType: Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'application/pdf')
        .messages({
            'any.only': 'فرمت فایل نامعتبر است'
        }),

    // Helper Functions
    getValidationSchema: (schema) => {
        return Joi.object(schema).messages({
            'object.unknown': 'فیلد نامعتبر ارسال شده است'
        });
    }
};

module.exports = publicValidators;