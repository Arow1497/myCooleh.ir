const Joi = require('joi');

const addCategorySchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.base': 'عنوان دسته‌بندی باید متن باشد',
            'string.empty': 'عنوان دسته‌بندی نمی‌تواند خالی باشد',
            'string.min': 'عنوان دسته‌بندی باید حداقل ۳ کاراکتر باشد',
            'string.max': 'عنوان دسته‌بندی نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد',
            'any.required': 'عنوان دسته‌بندی الزامی است'
        }),
    
    description: Joi.string()
        .min(10)
        .max(500)
        .allow('')
        .optional()
        .messages({
            'string.base': 'توضیحات باید متن باشد',
            'string.min': 'توضیحات باید حداقل ۱۰ کاراکتر باشد',
            'string.max': 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد'
        }),
    
    parent: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null)
        .optional()
        .messages({
            'string.pattern.base': 'شناسه دسته‌بندی والد معتبر نیست'
        })
});

const updateCategorySchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(100)
        .messages({
            'string.base': 'عنوان دسته‌بندی باید متن باشد',
            'string.empty': 'عنوان دسته‌بندی نمی‌تواند خالی باشد',
            'string.min': 'عنوان دسته‌بندی باید حداقل ۳ کاراکتر باشد',
            'string.max': 'عنوان دسته‌بندی نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد'
        }),
    
    description: Joi.string()
        .min(10)
        .max(500)
        .allow('')
        .optional()
        .messages({
            'string.base': 'توضیحات باید متن باشد',
            'string.min': 'توضیحات باید حداقل ۱۰ کاراکتر باشد',
            'string.max': 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد'
        })
});

const moveCategorySchema = Joi.object({
    categoryId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'شناسه دسته‌بندی معتبر نیست',
            'any.required': 'شناسه دسته‌بندی الزامی است'
        }),
    
    newParentId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null)
        .required()
        .messages({
            'string.pattern.base': 'شناسه دسته‌بندی والد جدید معتبر نیست',
            'any.required': 'شناسه دسته‌بندی والد جدید الزامی است'
        })
});

const categoryIdSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'شناسه دسته‌بندی معتبر نیست',
            'any.required': 'شناسه دسته‌بندی الزامی است'
        })
});

const searchCategorySchema = Joi.object({
    query: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.base': 'عبارت جستجو باید متن باشد',
            'string.empty': 'عبارت جستجو نمی‌تواند خالی باشد',
            'string.min': 'عبارت جستجو باید حداقل ۲ کاراکتر باشد',
            'string.max': 'عبارت جستجو نمی‌تواند بیشتر از ۵۰ کاراکتر باشد',
            'any.required': 'عبارت جستجو الزامی است'
        })
});

module.exports = {
    addCategorySchema,
    updateCategorySchema,
    moveCategorySchema,
    categoryIdSchema,
    searchCategorySchema
};