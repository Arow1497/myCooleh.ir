//سیستمی که در اون مکانیک ها بخصوص شاگرد ها از مراحلی که انجام دادن و پروسه هایی 
// که انجام دادن در پروژه توضیحات امل همراه با عکس میزارند و سازوکار پیشرفت پروژه 
//کاملا مشخص و توسط مدیر گاراژ قابل پیگیری هست 

const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();


class InGarageProcessFollowUpController extends Controller{
 // Private helper methods

// Controller methods

}

module.exports = {
    InGarageProcessFollowUpController: new InGarageProcessFollowUpController()
}