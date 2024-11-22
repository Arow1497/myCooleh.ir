const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { garagesSchema } = require("../../../validators/MainApp/garages.schema");

class GarageRegistrationController extends Controller{
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


// Controller methods
 
   async updateGarageById (req, res, next){
     try {
      
     } catch (error) {
      
     }
    
   }

   async deleteGarageById (req, res, next){
    try {
      
    } catch (error) {
      
    }
   }
   
   async employmentReqSendToGarageByMechanic_Apprentice(req, res, next){
    try {
      
    } catch (error) {
      
    }
   }
   
   async addMechanic_ApprenticeToGarage(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);
          const {mobile} = registrationDataBody;
          const garageID = req.user.garageID;
          const addMechanic = await UserModel.findOneAndUpdate(
            {"mobile" : mobile},
            {$set: {inWorkGarage : []}},
            {$push: {inWorkGarage : garageID}},
            {$addToSet: {resumeGarage : garageID}},
            )
            if(!addMechanic) throw createError.InternalServerError("مکانیک با این شماره در سیستم ثبت نشده")
            const updateGarage = await GaragesModel.updateOne(
              {"_id" : garageID},
              {$addToSet: {mechanicsTeam : addMechanic._id}},
          )
          if(!updateGarage) throw createError.InternalServerError("گاراژی به اسم شما ثبت نشده")
            return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "مکانیک با موفقیت به گاراژ شما افزوده شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }

   async removeMechanic_ApprenticeFromGarage(req, res, next){
    try {

          const MechanicID = req.body;
          const garageID = req.user.garageID;
          const removeMechanic = await GaragesModel.findOneAndUpdate(
            {"_id": garageID},
            {$pull: {mechanicsTeam : MechanicID}},
            )
            const removeMechanicUSER = await UsersModel.findOneAndUpdate(
              {"_id": MechanicID},
              {$pull: {inWorkGarage : garageID}},
              )
            if(!removeMechanic) throw createError.InternalServerError("مکانیک با این مشخصات در گاراژ شما مشغول به کار نیست ")
            return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "مکانیک با موفقیت از گاراژ شما حذف شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }

   async invitedWithGarageReferal(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);
          const {garageSerialNumber: serial} = registrationDataBody;
          const garageID = req.user.garageID;
          const addReferal = await GaragesModel.findOneAndUpdate(
            {garageSerialNumber : serial},
            {$addToSet: {referal : garageID}},
            {new: true, useFindAndModify: false},
          )
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "شما به لیست دعوت شده های گاراژ مربوطه اضافه شدید"
              }
          });
    } catch (error) {
        next(error)
    }
   }

}

module.exports = {
    GarageRegistrationController: new GarageRegistrationController()
}