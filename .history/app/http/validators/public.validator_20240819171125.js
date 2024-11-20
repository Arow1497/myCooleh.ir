
const Joi = require("@hapi/joi");
const createHttpError = require("http-errors");
const { MONGOIDPATTERN } = require("../../utils/constants");
const ObjectIdValidator = Joi.object({
    id : Joi.string().pattern(MONGOIDPATTERN).error(createHttpError.BadRequest(new createHttpError.BadRequest("شناسه وارد شده صحیح نمیباشد")))
})
module.exports = {
    ObjectIdValidator
}