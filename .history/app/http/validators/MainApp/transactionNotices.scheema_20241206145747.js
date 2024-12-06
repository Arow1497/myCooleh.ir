const Joi = require("joi")

const noticeSchema = {
    createNoticeSchema: Joi.object({
        title: Joi.string().min(3).max(100).required().messages({
            'string.empty': 'عنوان آگهی نمیتواند خالی باشد',
            'string.min': 'عنوان آگهی نمیتواند کمتر از 3 کاراکتر باشد',
            'string.max': 'عنوان آگهی نمیتواند بیشتر از 100 کاراکتر باشد'
        }),
        description: Joi.string().min(10).max(200).required().messages({
            'string.empty': 'توضیحات آگهی نمیتواند خالی باشد',
            'string.min': 'توضیحات آگهی نمیتواند کمتر از 10 کاراکتر باشد',
            'string.max': 'توضیحات آگهی نمیتواند بیشتر از 200 کاراکتر باشد'
        }),
        budget: Joi.object({
            amount: Joi.number().min(0).required().messages({
                'number.base': 'مبلغ حقوق باید عدد باشد',
                'number.min': 'مبلغ حقوق نمیتواند منفی باشد',
            }),
            type: Joi.string().valid('hourly', 'daily', 'monthly').required().messages({
                'any.only': 'نوع پرداخت حقوق معتبر نیست'
            })
        }).required(),
        workingHours: Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        }).optional().messages({
            'string.pattern.base': 'فرمت ساعت کاری معتبر نیست'
        }),
        expertices: Joi.string().valid('JOLOBANDI','ELECTRITIAN','ENGINEGEARBOX','OILAUTOSERVICE',
            'BODYREPAIR','PDRDENT').required().messages({
            'any.only': 'سطح تخصصی معتبر نیست'
        }),
        requirements: Joi.array().items(Joi.string()).min(1).optional().messages({
            'array.min': 'حداقل یک نیازمندی باید مشخص شود'
        }),
        city: Joi.string().required().messages({
            'string.empty': 'شهر نمیتواند خالی باشد'
        }),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
                size: Joi.number().max(5242880).required() // 5MB
            })
        ).optional()
    }),

    editNoticeSchema: Joi.object({
        title: Joi.string().min(3).max(100),
        description: Joi.string().min(10),
        salary: Joi.object({
            amount: Joi.number().min(0),
            type: Joi.string().valid('hourly', 'daily', 'monthly')
        }),
        workingHours: Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        }),
        requirements: Joi.array().items(Joi.string()).min(1),
        city: Joi.string(),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
                size: Joi.number().max(5242880).required()
            })
        ).optional()
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
        city: Joi.string().optional(),
        status: Joi.string().valid('pending', 'active', 'completed', 'cancelled').optional()
    }),

    complaintSchema: Joi.object({
        reason: Joi.string().required().messages({
            'string.empty': 'دلیل شکایت نمیتواند خالی باشد'
        }),
        description: Joi.string().min(10).required().messages({
            'string.empty': 'توضیحات شکایت نمیتواند خالی باشد',
            'string.min': 'توضیحات شکایت نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'application/pdf').required(),
                size: Joi.number().max(10485760).required() // 10MB
            })
        ).optional()
    }),

    complaintResponseSchema: Joi.object({
        response: Joi.string().min(10).required().messages({
            'string.empty': 'پاسخ شکایت نمیتواند خالی باشد',
            'string.min': 'پاسخ شکایت نمیتواند کمتر از 10 کاراکتر باشد'
        }),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'application/pdf').required(),
                size: Joi.number().max(10485760).required()
            })
        ).optional()
    }),

    reviewSchema: Joi.object({
        rating: Joi.number().min(1).max(5).required().messages({
            'number.base': 'امتیاز باید عدد باشد',
            'number.min': 'امتیاز نمیتواند کمتر از 1 باشد',
            'number.max': 'امتیاز نمیتواند بیشتر از 5 باشد'
        }),
        comment: Joi.string().min(10).max(500).required().messages({
            'string.empty': 'نظر نمیتواند خالی باشد',
            'string.min': 'نظر نمیتواند کمتر از 10 کاراکتر باشد',
            'string.max': 'نظر نمیتواند بیشتر از 500 کاراکتر باشد'
        })
    }),

    messageSchema: Joi.object({
        content: Joi.string().min(1).required().messages({
            'string.empty': 'متن پیام نمیتواند خالی باشد',
            'string.min': 'متن پیام نمیتواند خالی باشد'
        }),
        files: Joi.array().items(
            Joi.object({
                filename: Joi.string().required(),
                mimetype: Joi.string().valid(
                    'image/jpeg', 'image/png', 'image/gif',
                    'application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ).required(),
                size: Joi.number().max(10485760).required() // 10MB
            })
        ).optional()
    }),

    addCoWorkerSchema: Joi.object({
        salary: Joi.object({
            amount: Joi.number().min(0).required(),
            type: Joi.string().valid('hourly', 'daily', 'monthly').required()
        }).required(),
        workingHours: Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        }).required(),
        startDate: Joi.date().min('now').required().messages({
            'date.base': 'تاریخ شروع باید معتبر باشد',
            'date.min': 'تاریخ شروع نمیتواند در گذشته باشد'
        })
    }),

    idSchema: Joi.object({
        noticeApprenticeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
        apprenticeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
        transactionId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
        complaintId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
        conversationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
    }).messages({
        'string.pattern.base': 'شناسه معتبر نیست'
    })
};

module.exports = noticeSchema;