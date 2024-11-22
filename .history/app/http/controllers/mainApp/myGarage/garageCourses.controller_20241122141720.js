const createError = require("http-errors");
const Controller = require("../../controller");
const { StatusCodes:  HttpStatus} = require("http-status-codes");
const moment = require("moment-jalali");


class GarageCoursesController extends Controller{

    async addPhysicalCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }// تا چند استیج اول اپلیکیشن فقط فروش و در واقع معرفی دوره های واقعی رو داریم
    // بعدا دوره های انلاین هم اگه توجیه داشته باشه اضافه میشه
    // در واقع دوره های انلاین مثل برقکاری پروگرام آیسیو

    async removeCourseById(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async updateCourseById(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async getAllCoursesByAllGarage(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async getCoursesList(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    } //دیدن دوره های خودش --یدکی

    async getOneCoursesById(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }
    async bookmarkCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async likeCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async dislikeCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async getCommentOfCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async addCommentForCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async shareCourse(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async PurchaseCourseBeyane(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }// اسم و رزومه و مشخصات و کامنت های اون گاراژ برگذار کننده دوره نمایش داده میشه
    //ولی راه های ارتباطی نه بنابراین مبلغ بیعانه که حق نمایش دوره هست رو به حساب ما
    //واریز میکنه و به لیست ثبت نام کنندگان اضافه میشه


    async garageMonthlyServicesIncomeRevenue(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }//مجموع درآمد ورودی از سرویس هایی مثل کوپن -متریک -تامین قطعه درصدی- برونسپاری-دیوار و غیره
    // دیتیل و جزییات هرکدوم ازین سرویسها توی بخش مربوط به خودشون در دسترسه


}
module.exports = {
    GarageCoursesController: new GarageCoursesController()
}