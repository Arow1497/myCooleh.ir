const createError = require("http-errors");
const Controller = require("../controller");
const { ObjectIdValidator } = require("../../validators/public.validator");
const { DastyarRequestsModel } = require("../../../models/Mechanics-Garages/datyar.Requests");


class GarageOutSourcingReqsController extends Controller{

   async outSourcingReqsSendCoWorkingRequestByGarage(req, res, next){
    try {
      await CreateDastyarReqsSchema.validateAsync(req.body);
      const{title, message, audioFilename, fileUploadPath} = req.body;
      const publisher = req.user._id;
      const mechanicID = req.user._id;
      const dastyarreqID = req.params;
      const findReqs = await this.findDastyarReqById(dastyarreqID);
      const garageID = findReqs.garageID;
      const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
      const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`
      const seconds = await audioSeconds(voiceUrl);
      const time = getTime(seconds);
      const coWorkRequest = {
        mechanicID,
        garageID,
        publisher,
        title,
        message,
        images,
        garageDastyarReqsID: dastyarreqID,
        time,
        voiceAddress,
         }
         const addNewSupplyRequest = await DastyarRequestsModel.updateOne({
          _id: dastyarreqID},
       {$push: {
              "mechanicsRequestsForThisReqs": coWorkRequest
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
   async findDastyarReqById(dastyarreqID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: dastyarreqID });
    const dastyarReqs = await DastyarRequestsModel.findById(id);
    if (!dastyarReqs) throw new createError.NotFound("چنین آگهی یادفت نشد")
    return dastyarReqs
  }
}

module.exports = {
    GarageOutSourcingReqsController: new GarageOutSourcingReqsController()
}

