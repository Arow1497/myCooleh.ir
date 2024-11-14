const createError = require("http-errors");
const{ROLES} = require("../../../utils/constants");
const Controller = require("../controller");
const { ClientsModel } = require("../../../models/Garages/clients");
const { garagesSchema } = require("../../validators/MainApp/garages.schema");
const { GarageAwaitListsModel } = require("../../../models/Garages/garageAwaitList");
const { GaragesModel } = require("../../../models/Garages/garage");
const { ProjectsModel } = require("../../../models/Garages/projects");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { ObjectIdValidator } = require("../../validators/public.validator");


class PwaRegistrationController extends Controller{


   async registrationPWA(req, res, next){
    try {
            const clientDataBody = await createBlogSchema.validateAsync(req.body);
            const {first_name,
                last_name,
                carPlateNumber,
                carBuildYear,
                carModel,
                chassisNumber} = clientDataBody;      
            const data = {};
             if(first_name) data.first_name = first_name;
             if(last_name) data.last_name = last_name;
             if(carPlateNumber) data.carPlateNumber = carPlateNumber;
             if(carBuildYear) data.carBuildYear = carBuildYear;
             if(carModel) data.carModel = carModel;
             if(chassisNumber) data.chassisNumber = chassisNumber;
             data.Role = ROLES.CLIENT;

        const clientID = req.client._id;
        const registration = await ClientsModel.updateOne(
            {"_id": clientID},
            {$set: data})
          return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "پروفایل با موفقیت بروز رسانی شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }

   async garageClientAcceptance(req, res, next){
    try {
        const connectingDataBody = await garagesSchema.validateAsync(req.body);
          const {carModel, carChassisNumber, carBuildYear,carPlateNumber, garageSerialNumber} = connectingDataBody;
          const client_ID = req.client._id
          console.log(client_ID);
          const findGarage = await GaragesModel.findOne({"garageSerialNumber": garageSerialNumber});
          if(!findGarage) throw createError.InternalServerError(" شماره سریال گاراژ نادرست است");
          const addToGarageAwaitList = await GarageAwaitListsModel.create({
            clientID : client_ID,
            garageID : findGarage._id,
            carModel,
            carPlateNumber,
            carChassisNumber,
            carBuildYear,
          })
              return res.status(201).json({
              statusCode: 201,
              data: {
                  message: "درخواست پذیرش به گاراژ ارسال شد"
              }
          });
    } catch (error) {
        next(error)
    }
   }

   async showSuggestionSupplyPartReqsToClient(req, res, next){
    try {
        const clientID = req.client._id;
        const projectID = req.params;
        const checkExist = await this.findProjectById(projectID);
        if (!checkExist.clientID.equals(clientID)) {
            throw createError.NotAcceptable("نمایش پیشنهادات تامین قطعه فقط برای کارفرمای آن مجاز است");
          }
        const showSuggestedRrqs = await ProjectsModel.findById(projectID)
        .populate({
            path: "suggestionSupplyRequests",
            select: "suggestionSupplyRequests",
        })
        .select("suggestionSupplyRequests")
        .exec();
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                showSuggestedRrqs
            }
        });
    } catch (error) {
        next(error)
    }
   }
   
   async selectThisSupplyRequestByClient(req, res, next){
    try {
        const RequestedForSupplyID = req.params;
        supplierStoreID = req.params; // ایدی یدکی داخل ریکوعستد سپلای هست
        const clientID = req.client._id;
        const projectID = req.params;
        const checkExist = await this.findProjectById(projectID);
        if (!checkExist.clientID.equals(clientID)) {
            throw createError.NotAcceptable("ثبت تغییرات تامین قطعه فقط برای کارفرمای آن مجاز است");
          }
          const applySupplierForProject = await ProjectsModel.findByIdAndUpdate({_id: projectID},
            {$addToSet: {
                "supplierStoreID": matchingReqs
            }
        });
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "انتخاب تامین کننده انجام شد برای تسویه حساب هماهنگی های لازم را با مکانیک خود انجام دهید"
            }
        });
    } catch (error) {
        next(error)
    }
   } // اینجا باید یک پوش نوتیفیکیشن برای مکاینیک بره که مشتری تامین کننده
   // رو انتخاب کرد تسویه حساب رو انجام بده
//////////////////////////////////////////////////////////////////////////
async findProjectById(projectID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: projectID });
    const post = await ProjectsModel.findById(id);
    if (!post) throw new createError.NotFound("چنین پروژه ای یافت نشد")
    return post
  }

}

module.exports = {
    PwaRegistrationController: new PwaRegistrationController()
}