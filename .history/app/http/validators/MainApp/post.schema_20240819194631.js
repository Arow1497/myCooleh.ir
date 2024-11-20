const Joi = require("@hapi/joi");
const createError = require("http-errors");
const { MONGOIDPATTERN } = require("../../../utils/constants");
const CreatePostSchema = Joi.object({
    title : Joi.string().min(3).max(30).error(createError.BadRequest("عنوان دسته بندی صحیح نمیباشد")),
    tags: Joi.array().min(0).max(20).error(createError.BadRequest("برچسب ها نمیتواند بیشتر از 20 ایتم باشد")), 
    description: Joi.string().error(createError.BadRequest("متن ارسال شده صحیح نمیباشد")),
    category: Joi.string().regex(MONGOIDPATTERN).error(createError.BadRequest("دسته بندی مورد نظر یافت نشد")),
    price: Joi.number().error(createError.BadRequest("قیمت وارد شده صحیح نمیباشد")),
    imagesFilename: Joi.string().regex(/(\.m4v|\.mp4|\.mkv|\.mov|\.mpg\.png|\.jpg|\.webp|\.jpeg|\.gif)$/).error(createError.BadRequest("فایل ارسال شده صحیح نمیباشد")),
    videoFilename: Joi.string().regex(/(\.m4v|\.mp4|\.mkv|\.mov|\.mpg\.png|\.jpg|\.webp|\.jpeg|\.gif)$/).error(createError.BadRequest("فایل ارسال شده صحیح نمیباشد")),
    fileUploadPath: Joi.allow(),
    images: Joi.string().allow(),
    type: Joi.string().regex(/(technicians|public)/i),
    field: Joi.string().regex(/(mechanici|bodyShop|autoService)/i),
});
const UpdatePostSchema = Joi.object({
    title : Joi.string().min(3).max(30).error(createError.BadRequest("عنوان دسته بندی صحیح نمیباشد")),
    tags: Joi.array().min(0).max(20).error(createError.BadRequest("برچسب ها نمیتواند بیشتر از 20 ایتم باشد")), 
    description: Joi.string().error(createError.BadRequest("متن ارسال شده صحیح نمیباشد")),
    category: Joi.string().regex(MONGOIDPATTERN).error(createError.BadRequest("دسته بندی مورد نظر یافت نشد")),
    price: Joi.number().error(createError.BadRequest("قیمت وارد شده صحیح نمیباشد")),
    imagesFilename: Joi.string().regex(/(\.m4v|\.mp4|\.mkv|\.mov|\.mpg\.png|\.jpg|\.webp|\.jpeg|\.gif)$/).error(createError.BadRequest("فایل ارسال شده صحیح نمیباشد")),
    videoFilename: Joi.string().regex(/(\.m4v|\.mp4|\.mkv|\.mov|\.mpg\.png|\.jpg|\.webp|\.jpeg|\.gif)$/).error(createError.BadRequest("فایل ارسال شده صحیح نمیباشد")),
    fileUploadPath: Joi.allow(),
    images: Joi.string().allow(),
    type: Joi.string().regex(/(technicians|public)/i),
    field: Joi.string().regex(/(mechanici|bodyShop|autoService)/i),
});

module.exports = {
    CreatePostSchema,
    UpdatePostSchema
}