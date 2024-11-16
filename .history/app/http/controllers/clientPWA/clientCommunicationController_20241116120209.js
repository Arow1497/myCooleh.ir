const createError = require("http-errors");
const Controller = require("../../controller");

class ClientsCommunicationsController extends Controller{

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


}

module.exports = {
    ClientsCommunicationsController: new ClientsCommunicationsController()
}