const Joi = require('joi');

const postSchema = {
    createPostSchema: Joi.object({
        title: Joi.string().min(3).max(100).required().messages({
            'string.empty': 'عنوان پست نمیتواند خالی باشد',
            'string.min': 'عنوان پست نمیتواند کمتر از 3 کاراکتر باشد',
            'string.max': 'عنوان پست نمیتواند بیشتر از 100 کاراکتر باشد'
        }),
        content: Joi.string().min(10).required().messages({
            'string.empty': 'محتوای پست نمیتواند خالی باشد',
            'string.min': 'محتوای پست نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        category: Joi.string().required().messages({
            'string.empty': 'دسته بندی پست نمیتواند خالی باشد'
        }),
        tags: Joi.array().items(Joi.string()).optional(),
        status: Joi.string().valid('draft', 'published', 'archived').default('draft').messages({
            'any.only': 'وضعیت پست معتبر نیست'
        }),
        fileUploadPath: Joi.string().allow('').optional(),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
                size: Joi.number().max(5242880).required() // 5MB
            })
        ).optional().messages({
            'array.base': 'فرمت فایل‌ها نامعتبر است',
            'number.max': 'حجم هر فایل نمیتواند بیشتر از 5 مگابایت باشد'
        })
    }),

    updatePostSchema: Joi.object({
        title: Joi.string().min(3).max(100).messages({
            'string.min': 'عنوان پست نمیتواند کمتر از 3 کاراکتر باشد',
            'string.max': 'عنوان پست نمیتواند بیشتر از 100 کاراکتر باشد'
        }),
        content: Joi.string().min(10).messages({
            'string.min': 'محتوای پست نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        category: Joi.string(),
        tags: Joi.array().items(Joi.string()),
        status: Joi.string().valid('draft', 'published', 'archived'),
        fileUploadPath: Joi.string().allow(''),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
                size: Joi.number().max(5242880).required()
            })
        )
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
        sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'likes').default('createdAt'),
        order: Joi.string().valid('asc', 'desc').default('desc'),
        status: Joi.string().valid('draft', 'published', 'archived'),
        category: Joi.string(),
        tag: Joi.string(),
        timeframe: Joi.string().valid('day', 'week', 'month', 'year').default('week')
    }),

    searchSchema: Joi.object({
        q: Joi.string().required().min(2).messages({
            'string.empty': 'عبارت جستجو نمیتواند خالی باشد',
            'string.min': 'عبارت جستجو نمیتواند کمتر از 2 کاراکتر باشد'
        }),
        category: Joi.string().optional(),
        tag: Joi.string().optional(),
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(50).default(10)
    }),

    commentSchema: Joi.object({
        content: Joi.string().min(2).max(500).required().messages({
            'string.empty': 'محتوای نظر نمیتواند خالی باشد',
            'string.min': 'محتوای نظر نمیتواند کمتر از 2 کاراکتر باشد',
            'string.max': 'محتوای نظر نمیتواند بیشتر از 500 کاراکتر باشد'
        }),
        parentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
            'string.pattern.base': 'شناسه نظر والد معتبر نیست'
        })
    }),

    updateCommentSchema: Joi.object({
        content: Joi.string().min(2).max(500).required().messages({
            'string.empty': 'محتوای نظر نمیتواند خالی باشد',
            'string.min': 'محتوای نظر نمیتواند کمتر از 2 کاراکتر باشد',
            'string.max': 'محتوای نظر نمیتواند بیشتر از 500 کاراکتر باشد'
        })
    }),

    voteCommentSchema: Joi.object({
        voteType: Joi.string().valid('upvote', 'downvote').required().messages({
            'string.empty': 'نوع رای نمیتواند خالی باشد',
            'any.only': 'نوع رای معتبر نیست'
        })
    }),

    reportSchema: Joi.object({
        reason: Joi.string().required().valid(
            'INAPPROPRIATE_CONTENT',
            'SPAM',
            'HATE_SPEECH',
            'MISINFORMATION',
            'COPYRIGHT_VIOLATION',
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
    }),

    repostSchema: Joi.object({
        additionalContent: Joi.string().max(500).allow('').optional().messages({
            'string.max': 'محتوای اضافی نمیتواند بیشتر از 500 کاراکتر باشد'
        })
    }),

    updatePostFieldSchema: Joi.object({
        postField: Joi.object({
            field: Joi.string().required().messages({
                'string.empty': 'نام فیلد نمیتواند خالی باشد'
            }),
            value: Joi.any().required().messages({
                'any.required': 'مقدار فیلد نمیتواند خالی باشد'
            })
        }).required()
    }),

    idSchema: Joi.object({
        id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.empty': 'شناسه نمیتواند خالی باشد',
            'string.pattern.base': 'شناسه معتبر نیست'
        })
    })
};

module.exports = postSchema;