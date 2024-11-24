const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');


class PlatformAdsController extends Controller{
    // Private helper methods
      
      async #validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
          throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
      }
    
  //////////////////////////////////////////////////////////////////////////////

      // Controller methods
     async reqForAds(req, res, next){
        try {
          //کلن ها تایپ های مختلف دارن مثل مکانیکی ها اتوسرویس ها صافکار نقاشی
        } catch (error) {
          
        }
      }

     async interactRate_ViewClickShare_(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }   

      async payment(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

      async billingHistory(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

    
    }

    
module.exports = {
    PlatformAdsController: new PlatformAdsController()
}


