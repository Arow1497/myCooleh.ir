const createError = require("http-errors");
const{ROLES} = require("../../../../utils/constants");
const Controller = require("../../controller");
const { GaragesModel } = require("../../../../models/Garages/garage");
const { garagesSchema } = require("../../../validators/MainApp/garages.schema");
const { UsersModel } = require("../../../../models/Main/user");
const { serialNumGenerator, ListOfImagesFromRequest, deleteFileInPublic } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const { AgahiBoronseparisModel } = require("../../../../models/Mechanics-Garages/agahi.outSourcingRequests");


class GarageRegistrationController extends Controller{


   async registrationGarage(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);
          const {garage_name,
            telephone,
            addres,
            lat_lng,
            garageField,
            garageMainField,
            first_name,
             last_name,} = registrationDataBody;
            const serialNum = serialNumGenerator();
            const garage_owner = req.user._id;
            const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
            const garageRegistration = await GaragesModel.create({
            garage_name,
            garageOwner: garage_owner,
            telephone,
            addres,
            images,
            lat_lng,
            garageField,
            garageMainField,
            garageSerialNumber : serialNum,
            })
            const findGarage = await GaragesModel.findOne(
              {"garageSerialNumber" : serialNum},
              );
            if(!findGarage) throw createError.NotFound("گاراژ مورد نطر پیدا نشد");
              const data = {};
              if(first_name) data.first_name = first_name;
              if(last_name) data.last_name = last_name;            
              data.Role = ROLES.GARAGE_OWNER;
              data.garageID = findGarage._id;

            const userUpdate = await UsersModel.updateOne(
              {"_id": garage_owner},
              {$set: data});
              if(!userUpdate) throw createError.NotFound("کاربر مورد نطر پیدا نشد");

         // ایجاد اشتراک
         const startDate = new Date();
         const endDate= new Date();
         endDate.setMonth(startDate.getMonth() + 3);
         const newSubscription = await SubscriptionsModel.create({
          user : garage_owner,
          subscriptionStartDate : startDate,
          subscriptionEndDate : endDate,
          subscriptionType : "free"
         });
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: " مدیر گاراژ گرامی کسب و کار شما با موفقیت ایجاد و اشتراک 3 ماهه رایگان برای شما فعال شد"
              }
          });
    } catch (error) {
      deleteFileInPublic(req.files)
        next(error)
    }
   }


   async addMechanicToGarage(req, res, next){
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


   async removeMechanicFromGarage(req, res, next){
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

   async addShagerdToGarage(req, res, next){
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
                  message: "شاگرد با موفقیت به گاراژ شما افزوده شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }


   async removeShagerdFromGarage(req, res, next){
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
                  message: "شاگرد با موفقیت از گاراژ شما حذف شد"
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

   async outSourcingReqsSendCoWorkingRequestByGarage(req, res, next){
    try {
      await CreateOutSourcingReqsSchema.validateAsync(req.body);
      const{title, message, audioFilename, fileUploadPath} = req.body;
      const publisher = req.user._id;
      const garageID = req.user.garageID; //گاراژ درخواست همکاری دهنده
      const outsourcingreqID = req.params;
      const findReqs = await this.findOutSourcingReqById(outsourcingreqID);
      const garageOutSourcingReqsID = findReqs.garageID;
      const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
      const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`
      const seconds = await audioSeconds(voiceUrl);
      const time = getTime(seconds);
      const coWorkRequest = {
        garageID,
        publisher,
        garageOutSourcingReqsID,
        title,
        message,
        images,
        outSourcingReqsID: outsourcingreqID,
        time,
        voiceAddress,
         }
         const addNewOutSourcindRequest = await AgahiBoronseparisModel.updateOne({
          _id: outsourcingreqID},
       {$push: {
              "garagesRequestsForThisReqs": coWorkRequest
          }
      });
      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data: {
          message: "ثبت درخواست همکاری با گاراژ با موفقیت انجام شد"
        }
    });
    } catch (error) {
      deleteFilesInPublicForOrders(req.files);
        next(error)
    }
   }

   ////////////////////////////////////////////////////////////////////////////////
   async findOutSourcingReqById(outsourcingreqID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: outsourcingreqID });
    const outsourcingReq = await AgahiBoronseparisModel.findById(id);
    if (!outsourcingReq) throw new createError.NotFound("چنین آگهی یافت نشد")
    return outsourcingReq
  }
}

module.exports = {
    GarageRegistrationController: new GarageRegistrationController()
}