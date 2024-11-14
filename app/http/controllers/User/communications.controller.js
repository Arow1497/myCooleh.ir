const createError = require("http-errors");
const Controller = require("../../controller");
const { garagesSchema } = require("../../../validators/admin/garages.schema");
const { UserModel } = require("../../../../models/Main/user");


class UsersCommunicationsController extends Controller{

   async createCommentForMetric(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

   async createCommentForProduct(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

   async createCommentForProject(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }
   async createCommentForCoupon(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

   async createCommentForDastyarReq(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   } // کامنت هایی که گاراژ ها برای همکاری با این مکانیک گذاشتن یا یدکی ها برای کوپن براش گذاشتن

   async createCommentForOutsourcingReq(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   } 
}

module.exports = {
    UsersCommunicationsController: new UsersCommunicationsController()
}