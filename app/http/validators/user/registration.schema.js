const Joi = require("@hapi/joi");
const {MONGOIDPATTERN} = require("../../../utils/constans");
const createHttpError = require("http-errors");

const registrationSchema = Joi.object({
    first_name: Joi.string().min(3).max(30).error(createHttpError.BadRequest("عنوان دسته بندی صحیح نمیباشد")),
    last_name: Joi.string().error(createHttpError.BadRequest("متن ارسال شده صحیح نمیباشد")),
    filename: Joi.string().pattern(/(\.png|\.jpg|\.webp|\.jpeg|\.gif)$/).error(createHttpError.BadRequest("تصویر ارسال شده صحیح نمیباشد")),
    tags: Joi.array().min(0).max(20).error(createHttpError.BadRequest("برچسب ها نمیتوانند بیشتر از 20 آیتم باشند")),
    category: Joi.string().pattern(MONGOIDPATTERN).error(createHttpError.BadRequest("دسته بندی مورد نظر یافت نشد")),
    fileUploadPath: Joi.allow()
});



module.exports = {
    registrationSchema
}