const Joi = require("@hapi/joi");
const createHttpError = require("http-errors");
const { MONGOIDPATTERN } = require("../../../utils/constants");
const addCategorySchema = Joi.object({
    title : Joi.string().min(3).max(30).error(createHttpError.BadRequest("عنوان دسته بندی صحیح نمیباشد")),
    parent: Joi.string().allow('').pattern(MONGOIDPATTERN).allow("").error(createHttpError.BadRequest("شناسه ارسال شده صحیح نمیباشد"))
});
const updateCategorySchema = Joi.object({
    title : Joi.string().min(3).max(30).error(createHttpError.BadRequest("عنوان دسته بندی صحیح نمیباشد")),
});

module.exports = {
    addCategorySchema,
    updateCategorySchema
}