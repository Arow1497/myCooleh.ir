const createError = require("http-errors");
const Controller = require("../../controller");
const{ROLES} = require("../../../../utils/constants");
const { garagesSchema } = require("../../../validators/admin/garages.schema");
const { UsersModel } = require("../../../models/Main/user");
const { SupplierStoresModel } = require("../../../models/PartSupplier.js/supplierStore");
const { deleteFileInPublic } = require("../../../utils/functions");


class SupplierStoreRegistrationController extends Controller{


   async registrationSupplierStore(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);

          const {supplierstore_name,
            telephone,
            addres,
            lat_lng,
            images,
            supplierstoreField,
            first_name,
             last_name,} = registrationDataBody;
            const serialNum = serialNumGenerator();
            const supplierstore_Owner = req.user._id;
          const supplierStoreRegistration = await SupplierStoresModel.create({
            supplierstore_name,
            telephone,
            addres,
            images,
            lat_lng,
            supplierstoreField,
            supplierstoreOwner : supplierstore_Owner,
            supplierStoreSerialNumber : serialNum,
            })
            const findSupplierStore = await SupplierStoresModel.findOne(
              {"supplierStoreSerialNumber" : serialNum});
              const data = {};
            if(first_name) data.first_name = first_name;
            if(last_name) data.last_name = last_name;            
            data.Role = ROLES.SUPPLIER;
            data.supplierStoreID = findSupplierStore._id;
            const userUpdate = await UsersModel.updateOne(
              {"_id": supplierstore_Owner},
              {$Set: data});

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
                  message: "تامین کنننده گرامی کسب و کار شما با موفقیت ایجاد و اشتراک 3 ماهه رایگان برای شما فعال شد"
              }
          });
    } catch (error) {
      deleteFileInPublic(req.files);
        next(error)
    }
   }


   async invitedWithGarageReferal(req, res, next){
    try {
        const registrationDataBody = await garagesSchema.validateAsync(req.body);
          const {supplierStoreSerialNumber} = registrationDataBody;
          const supplierStoreID = req.user.supplierStoreID;
          const addReferal = await SupplierStoresModel.updateOne(
            {"supplierStoreSerialNumber" : supplierStoreSerialNumber},
            {$addToSet: {referal : supplierStoreID}})
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "شما به لیست دعوت شده های یدکی مربوطه اضافه شدید"
              }
          });
    } catch (error) {
        next(error)
    }
   }
}

module.exports = {
  SupplierStoreRegistrationController: new SupplierStoreRegistrationController()
}