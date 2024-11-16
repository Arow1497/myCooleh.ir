const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../../../../utils/functions");
const { garagesSchema } = require("../../../validators/MainApp/garages.schema");
const { serialNumGenerator, ListOfImagesFromRequest, deleteFileInPublic } = require("../../../../utils/functions");
const { getLink } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");

class SquadesController extends Controller{
    // Private helper methods
    async #validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                noticeApprentice: {
                    select: {
                        apprenticeId: true,
                        publisherId: true
                    }
                }
            }
        });
      
        if (!transaction) throw createError.NotFound("Transaction not found");
      
        const isOwner = role === 'apprentice' 
            ? transaction.noticeApprentice.apprenticeId === userId
            : transaction.noticeApprentice.publisherId === userId;
      
        if (!isOwner) throw createError.Unauthorized("Not authorized to perform this action");
      
        return transaction;
      }
      
      async #validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
          throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
      }
      
  //////////////////////////////////////////////////////////////////////////////

      // Controller methods
     async createClan(req, res, next){
        try {
          //کلن ها تایپ های مختلف دارن مثل مکانیکی ها اتوسرویس ها صافکار نقاشی
        } catch (error) {
          
        }
      }

     async requestToJoinClan(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }   

      async addMemberToClan(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

      async roleDelegationToMember(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

      async getAllCity_RegionClans(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

      async supplierReqToJoinClan(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

      async PartProvideGlobalCouponReqToClan(req, res, next){
        try {
          //تامین کننده ها درصد سود از فروش هر قطعه پیشنهاد بدن به اعضای کلن تا درصورت خواست دیل کنن
          
        } catch (error) {
          
        }
      }

      async clanConversationRoom(req, res, next){
        try {
          
        } catch (error) {
          
        }
      }

    
    }

    
module.exports = {
    SquadesController: new SquadesController()
}


