const Joi = require('joi');

const productSchema = {
    // Product CRUD Schemas
    createProductSchema: Joi.object({
        title: Joi.string().min(3).max(100).required().messages({
            'string.empty': 'عنوان محصول نمیتواند خالی باشد',
            'string.min': 'عنوان محصول نمیتواند کمتر از 3 کاراکتر باشد',
            'string.max': 'عنوان محصول نمیتواند بیشتر از 100 کاراکتر باشد'
        }),
        description: Joi.string().min(10).required().messages({
            'string.empty': 'توضیحات محصول نمیتواند خالی باشد',
            'string.min': 'توضیحات محصول نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        price: Joi.number().min(0).required().messages({
            'number.base': 'قیمت باید عدد باشد',
            'number.min': 'قیمت نمیتواند منفی باشد'
        }),
        category: Joi.string().required().messages({
            'string.empty': 'دسته‌بندی محصول نمیتواند خالی باشد'
        }),
        stock: Joi.number().min(0).required().messages({
            'number.base': 'موجودی باید عدد باشد',
            'number.min': 'موجودی نمیتواند منفی باشد'
        }),
        tags: Joi.array().items(Joi.string()).optional(),
        specifications: Joi.object().optional(),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
                size: Joi.number().max(5242880).required() // 5MB
            })
        ).optional()
    }),

    updateProductSchema: Joi.object({
        title: Joi.string().min(3).max(100),
        description: Joi.string().min(10),
        price: Joi.number().min(0),
        category: Joi.string(),
        stock: Joi.number().min(0),
        tags: Joi.array().items(Joi.string()),
        specifications: Joi.object(),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
                size: Joi.number().max(5242880).required()
            })
        )
    }),

    // Basket Operation Schemas
    basketItemSchema: Joi.object({
        productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'شناسه محصول معتبر نیست'
        }),
        quantity: Joi.number().min(1).required().messages({
            'number.base': 'تعداد باید عدد باشد',
            'number.min': 'تعداد نمیتواند کمتر از 1 باشد'
        })
    }),

    bulkActionSchema: Joi.object({
        action: Joi.string().valid('move', 'remove', 'update').required().messages({
            'any.only': 'عملیات درخواستی معتبر نیست'
        }),
        productIds: Joi.array().items(
            Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
        ).min(1).required().messages({
            'array.min': 'حداقل یک محصول باید انتخاب شود'
        })
    }),

    // Search Operation Schemas
    searchQuerySchema: Joi.object({
        q: Joi.string().min(2).optional().messages({
            'string.min': 'عبارت جستجو نمیتواند کمتر از 2 کاراکتر باشد'
        }),
        category: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        minPrice: Joi.number().min(0).optional(),
        maxPrice: Joi.number().min(0).optional(),
        sortBy: Joi.string().valid('price', 'createdAt', 'popularity').optional(),
        order: Joi.string().valid('asc', 'desc').optional(),
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(50).default(10)
    }),

    // Statistics Operation Schemas
    statisticsQuerySchema: Joi.object({
        timeframe: Joi.string().valid('day', 'week', 'month', 'year').default('week'),
        limit: Joi.number().min(1).max(50).default(10),
        category: Joi.string().optional()
    }),

    // Product Management Schemas
    bulkUpdateSchema: Joi.object({
        productIds: Joi.array().items(
            Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
        ).min(1).required().messages({
            'array.min': 'حداقل یک محصول باید انتخاب شود'
        }),
        updates: Joi.object({
            price: Joi.number().min(0),
            stock: Joi.number().min(0),
            published: Joi.boolean(),
            category: Joi.string(),
            tags: Joi.array().items(Joi.string())
        }).required().messages({
            'object.base': 'مقادیر بروزرسانی باید مشخص شود'
        })
    }),

    shareProductSchema: Joi.object({
        platform: Joi.string().valid(
            'TELEGRAM',
            'WHATSAPP',
            'EMAIL',
            'LINKEDIN',
            'TWITTER'
        ).required().messages({
            'any.only': 'پلتفرم اشتراک‌گذاری معتبر نیست'
        }),
        customMessage: Joi.string().max(200).optional().messages({
            'string.max': 'پیام سفارشی نمیتواند بیشتر از 200 کاراکتر باشد'
        })
    }),

    // Common Query Parameters Schema
    queryParamsSchema: Joi.object({
        page: Joi.number().min(1).default(1).messages({
            'number.base': 'شماره صفحه باید عدد باشد',
            'number.min': 'شماره صفحه نمیتواند کمتر از 1 باشد'
        }),
        limit: Joi.number().min(1).max(50).default(10).messages({
            'number.base': 'تعداد آیتم در هر صفحه باید عدد باشد',
            'number.min': 'تعداد آیتم در هر صفحه نمیتواند کمتر از 1 باشد',
            'number.max': 'تعداد آیتم در هر صفحه نمیتواند بیشتر از 50 باشد'
        }),
        sortBy: Joi.string().valid('price', 'createdAt', 'updatedAt', 'title').default('createdAt'),
        order: Joi.string().valid('asc', 'desc').default('desc')
    }),

    // ID Parameter Schema
    idSchema: Joi.object({
        id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'شناسه معتبر نیست'
        }),
        productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
            'string.pattern.base': 'شناسه محصول معتبر نیست'
        }),
        userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
            'string.pattern.base': 'شناسه کاربر معتبر نیست'
        })
    })
};

module.exports = productSchema;