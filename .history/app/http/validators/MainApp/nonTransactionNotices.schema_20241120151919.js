const Joi = require('joi');

const noticeSchema = {
    createNoticeSchema: Joi.object({
        title: Joi.string().min(3).max(100).required().messages({
            'string.empty': 'عنوان آگهی نمیتواند خالی باشد',
            'string.min': 'عنوان آگهی نمیتواند کمتر از 3 کاراکتر باشد',
            'string.max': 'عنوان آگهی نمیتواند بیشتر از 100 کاراکتر باشد'
        }),
        description: Joi.string().min(10).required().messages({
            'string.empty': 'توضیحات آگهی نمیتواند خالی باشد',
            'string.min': 'توضیحات آگهی نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        category: Joi.string().required().messages({
            'string.empty': 'دسته بندی آگهی نمیتواند خالی باشد'
        }),
        location: Joi.string().required().messages({
            'string.empty': 'موقعیت مکانی آگهی نمیتواند خالی باشد'
        }),
        salary: Joi.number().min(0).messages({
            'number.base': 'حقوق باید یک عدد باشد',
            'number.min': 'حقوق نمیتواند منفی باشد'
        }),
        contactInfo: Joi.object({
            phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).messages({
                'string.pattern.base': 'شماره تلفن معتبر نیست'
            }),
            email: Joi.string().email().messages({
                'string.email': 'ایمیل معتبر نیست'
            })
        }),
        fileUploadPath: Joi.string().allow('').optional(),
        tags: Joi.array().items(Joi.string()).optional()
    }),

    updateNoticeSchema: Joi.object({
        title: Joi.string().min(3).max(100).messages({
            'string.min': 'عنوان آگهی نمیتواند کمتر از 3 کاراکتر باشد',
            'string.max': 'عنوان آگهی نمیتواند بیشتر از 100 کاراکتر باشد'
        }),
        description: Joi.string().min(10).messages({
            'string.min': 'توضیحات آگهی نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        category: Joi.string(),
        location: Joi.string(),
        salary: Joi.number().min(0).messages({
            'number.base': 'حقوق باید یک عدد باشد',
            'number.min': 'حقوق نمیتواند منفی باشد'
        }),
        contactInfo: Joi.object({
            phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/),
            email: Joi.string().email()
        }),
        fileUploadPath: Joi.string().allow('').optional(),
        tags: Joi.array().items(Joi.string()).optional()
    }),

    querySchema: Joi.object({
        page: Joi.number().min(1).default(1).messages({
            'number.base': 'شماره صفحه باید عدد باشد',
            'number.min': 'شماره صفحه نمیتواند کمتر از 1 باشد'
        }),
        limit: Joi.number().min(1).max(50).default(10).messages({
            'number.base': 'تعداد آیتم در هر صفحه باید عدد باشد',
            'number.min': 'تعداد آیتم در هر صفحه نمیتواند کمتر از 1 باشد',
            'number.max': 'تعداد آیتم در هر صفحه نمیتواند بیشتر از 50 باشد'
        }),
        sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title').default('createdAt'),
        order: Joi.string().valid('asc', 'desc').default('desc')
    }),

    searchSchema: Joi.object({
        q: Joi.string().required().min(2).messages({
            'string.empty': 'عبارت جستجو نمیتواند خالی باشد',
            'string.min': 'عبارت جستجو نمیتواند کمتر از 2 کاراکتر باشد'
        }),
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(50).default(10)
    }),

    reportSchema: Joi.object({
        reason: Joi.string().required().valid(
            'INAPPROPRIATE_CONTENT',
            'SPAM',
            'MISLEADING_INFO',
            'FRAUD',
            'OTHER'
        ).messages({
            'string.empty': 'دلیل گزارش نمیتواند خالی باشد',
            'any.only': 'دلیل گزارش معتبر نیست'
        }),
        description: Joi.string().min(10).required().messages({
            'string.empty': 'توضیحات گزارش نمیتواند خالی باشد',
            'string.min': 'توضیحات گزارش نمیتواند کمتر از 10 کاراکتر باشد'
        })
    }),

    shareSchema: Joi.object({
        platform: Joi.string().required().valid(
            'TELEGRAM',
            'WHATSAPP',
            'EMAIL',
            'LINKEDIN',
            'TWITTER'
        ).messages({
            'string.empty': 'پلتفرم اشتراک گذاری نمیتواند خالی باشد',
            'any.only': 'پلتفرم اشتراک گذاری معتبر نیست'
        }),
        customMessage: Joi.string().max(200).allow('').optional().messages({
            'string.max': 'پیام سفارشی نمیتواند بیشتر از 200 کاراکتر باشد'
        })
    })
};

module.exports = noticeSchema;