const createError = require("http-errors");
const Controller = require("../../controller");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const { GaragePartsOrdersModel } = require("../../../models/Garages/garagePartOrders");
const { ListOfImagesFromRequest, audioSeconds, getTime, deleteFilesInPublicForOrders } = require("../../../../utils/functions");


class SupplierPartOrderRequestController extends Controller{

   async addRequestForPartOrderSupply(req, res, next){
    try {
        await CreatePartOrderSchema.validateAsync(req.body);
        const{title, description, price, audioFilename, fileUploadPath} = req.body;
        const publisher = req.user._id;
        const supplierstoreID = publisher.supplierStoreID;
        const partorderID = req.params;
        const partOrder = await this.findPartOrderById(partorderID);
        const garageID = partOrder.garageID;
        const CoWorkHistory = await GaragePartsOrdersModel.countDocuments({ garageID: garageID,
            acceptedSuplierStoreID: supplierstoreID}); // خروجی نامبر
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
         const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`
         const seconds = await audioSeconds(voiceUrl);
         const time = getTime(seconds);
        const supplyRequest = {
            title,
            description,
            price,
            publisher,
            supplierstoreID,
            images,
            garagePartsOrderID: partorderID,
            supplyHistoryWithThisGarage: CoWorkHistory,
            time,
            voiceAddress,
        }
        const addNewSupplyRequest = await GaragePartsOrdersModel.updateOne({
            _id: partorderID},
         {$push: {
                "SupplyRequestsForThisOrder": supplyRequest
            }
        });

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
              message: "ثبت درخواست تامین قطعه با موفقیت انجام شد"
            }
        });

    } catch (error) {
        deleteFilesInPublicForOrders(req.files);
        next(error)
    }
   }

   async notifyThatClientChooseYourSupplyReqs(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

   
   ////////////////////////////////////////////////////////////////////////////////
   async findPartOrderById(partorderID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: partorderID });
    const partOrder = await GaragePartsOrdersModel.findById(id);
    if (!partOrder) throw new createError.NotFound("سفارشی یافت نشد")
    return partOrder
  
     }

}

module.exports = {
    SupplierPartOrderRequestController: new SupplierPartOrderRequestController()
}