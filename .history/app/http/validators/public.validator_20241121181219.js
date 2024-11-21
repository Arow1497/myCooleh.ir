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

    // اضافه کردن ولیدیتورهای امنیتی
    password: Joi.string()
    .min(8)
    .max(72) // حداکثر طول پشتیبانی شده توسط bcrypt
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .messages({
        'string.min': 'رمز عبور باید حداقل ۸ کاراکتر باشد',
        'string.max': 'رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد',
        'string.pattern.base': 'رمز عبور باید شامل حروف بزرگ، کوچک، اعداد و کاراکترهای خاص باشد'
    }),

    // ولیدیتور نام کاربری
    username: Joi.string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_.-]+$/)
        .messages({
            'string.min': 'نام کاربری باید حداقل ۳ کاراکتر باشد',
            'string.max': 'نام کاربری نمی‌تواند بیشتر از ۳۰ کاراکتر باشد',
            'string.pattern.base': 'نام کاربری فقط می‌تواند شامل حروف، اعداد، نقطه، خط تیره و زیرخط باشد'
        }),

    // ولیدیتور کد ملی
    nationalCode: Joi.string()
        .length(10)
        .pattern(/^\d{10}$/)
        .custom((value, helpers) => {
            // الگوریتم بررسی صحت کد ملی
            if (value.length !== 10) return helpers.error('string.length');
            
            const check = +value[9];
            const sum = value.split('').slice(0, 9).reduce((acc, x, i) => acc + (+x * (10 - i)), 0) % 11;
            if ((sum < 2 && check === sum) || (sum >= 2 && check + sum === 11)) return value;
            
            return helpers.error('string.invalid');
        })
        .messages({
            'string.length': 'کد ملی باید ۱۰ رقم باشد',
            'string.pattern.base': 'کد ملی باید فقط شامل اعداد باشد',
            'string.invalid': 'کد ملی نامعتبر است'
        }),

    // ولیدیتور آدرس وب
    url: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .messages({
            'string.uri': 'آدرس وب نامعتبر است'
        }),

    // ولیدیتور تگ‌ها
    tags: Joi.array()
        .items(Joi.string().min(2).max(20))
        .unique()
        .min(1)
        .max(10)
        .messages({
            'array.unique': 'تگ‌ها نمی‌توانند تکراری باشند',
            'array.min': 'حداقل یک تگ الزامی است',
            'array.max': 'حداکثر ۱۰ تگ مجاز است',
            'string.min': 'هر تگ باید حداقل ۲ کاراکتر باشد',
            'string.max': 'هر تگ نمی‌تواند بیشتر از ۲۰ کاراکتر باشد'
        }),

    // ولیدیتور کد پستی
    postalCode: Joi.string()
        .length(10)
        .pattern(/^\d{10}$/)
        .messages({
            'string.length': 'کد پستی باید ۱۰ رقم باشد',
            'string.pattern.base': 'کد پستی باید فقط شامل اعداد باشد'
        }),

    // ولیدیتور IBAN (شماره شبا)
    iban: Joi.string()
        .length(26)
        .pattern(/^IR[0-9]{24}$/)
        .messages({
            'string.length': 'شماره شبا باید ۲۶ کاراکتر باشد',
            'string.pattern.base': 'فرمت شماره شبا نامعتبر است'
        }),

    // ولیدیتور شماره کارت بانکی
    creditCard: Joi.string()
        .length(16)
        .pattern(/^\d{16}$/)
        .custom((value, helpers) => {
            // الگوریتم Luhn برای اعتبارسنجی شماره کارت
            let sum = 0;
            for (let i = 0; i < 16; i++) {
                let digit = parseInt(value[i]);
                if (i % 2 === 0) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                }
                sum += digit;
            }
            return sum % 10 === 0 ? value : helpers.error('string.invalid');
        })
        .messages({
            'string.length': 'شماره کارت باید ۱۶ رقم باشد',
            'string.pattern.base': 'شماره کارت باید فقط شامل اعداد باشد',
            'string.invalid': 'شماره کارت نامعتبر است'
        }),

    // ولیدیتور تاریخ شمسی
    jalaliDate: Joi.string()
        .pattern(/^1[34]\d{2}\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/)
        .messages({
            'string.pattern.base': 'فرمت تاریخ شمسی نامعتبر است (مثال: ۱۴۰۲/۰۱/۰۱)'
        }),

    // ولیدیتور محدوده زمانی
    dateRange: {
        from: Joi.date().iso().required(),
        to: Joi.date().iso().min(Joi.ref('from')).required()
    },

    // ولیدیتور زمان
    time: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
        .messages({
            'string.pattern.base': 'فرمت زمان نامعتبر است (مثال: ۲۳:۵۹ یا ۲۳:۵۹:۵۹)'
        }),

    // ولیدیتور رنگ
    color: Joi.string()
        .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .messages({
            'string.pattern.base': 'فرمت رنگ نامعتبر است (مثال: #FF0000)'
        }),

    // ولیدیتور JSON
    jsonData: Joi.string()
        .custom((value, helpers) => {
            try {
                JSON.parse(value);
                return value;
            } catch (error) {
                return helpers.error('string.invalid');
            }
        })
        .messages({
            'string.invalid': 'فرمت JSON نامعتبر است'
        }),

    // ولیدیتور آی‌پی
    ipAddress: Joi.string().ip({ version: ['ipv4', 'ipv6'] })
        .messages({
            'string.ip': 'آدرس IP نامعتبر است'
        }),

    // ولیدیتور نسخه نرم‌افزار
    version: Joi.string()
        .pattern(/^\d+\.\d+\.\d+$/)
        .messages({
            'string.pattern.base': 'فرمت نسخه نامعتبر است (مثال: ۱.۰.۰)'
        }),

    // توابع کمکی جدید
    helpers: {
        // تابع برای ولیدیت کردن آرایه‌ای از آیدی‌ها با حداقل و حداکثر تعداد مشخص
        validateIdArray: (min = 1, max = 100) => {
            return Joi.array()
                .items(Joi.number().integer().positive())
                .min(min)
                .max(max)
                .messages({
                    'array.min': `حداقل ${min} آیدی الزامی است`,
                    'array.max': `حداکثر ${max} آیدی مجاز است`
                });
        },

        // تابع برای ایجاد ولیدیتور enum با پیام خطای سفارشی
        createEnum: (values, label) => {
            return Joi.string()
                .valid(...values)
                .messages({
                    'any.only': `${label} باید یکی از این مقادیر باشد: ${values.join(', ')}`
                });
        },

        // تابع برای ولیدیت کردن فایل با محدودیت حجم و نوع
        validateFile: (maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png']) => {
            return Joi.object({
                size: Joi.number().max(maxSize)
                    .messages({
                        'number.max': `حجم فایل نمی‌تواند بیشتر از ${maxSize / (1024 * 1024)} مگابایت باشد`
                    }),
                mimetype: Joi.string().valid(...allowedTypes)
                    .messages({
                        'any.only': `نوع فایل باید یکی از این موارد باشد: ${allowedTypes.join(', ')}`
                    })
            });
        }
    },

    // تابع اصلی ساخت اسکیما با قابلیت‌های بیشتر
    getValidationSchema: (schema, options = {}) => {
        const defaultOptions = {
            stripUnknown: true,
            abortEarly: false,
            ...options
        };

        return Joi.object(schema)
            .options(defaultOptions)
            .messages({
                'object.unknown': 'فیلد نامعتبر ارسال شده است'
            });
    },
    
    // Helper Functions
    getValidationSchema: (schema) => {
        return Joi.object(schema).messages({
            'object.unknown': 'فیلد نامعتبر ارسال شده است'
        });
    }

};

module.exports = publicValidators;