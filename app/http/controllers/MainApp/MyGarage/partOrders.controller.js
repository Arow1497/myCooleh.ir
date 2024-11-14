const createError = require("http-errors");
const Controller = require("../../controller");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const { GaragePartsOrdersModel } = require("../../../../models/Garages/garagePartOrders");
const { ProjectsModel } = require("../../../../models/Garages/projects");
const { audioSeconds, getTime, ListOfImagesFromRequest } = require("../../../../utils/functions");


class GaragePartOrdersController extends Controller{

   async addPartOrder(req, res, next){
    try {
        await CreatePartOrderSchema.validateAsync(req.body);
        const{title, description, audioFilename, fileUploadPath} = req.body;
        const publisher = req.user._id;
        const garageID = req.user.garageID;
        const clientID = req.params;
        const projectID = req.params;
        await this.findPartOrderById(projectID);
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        const voiceAddress = path.join(fileUploadPath, audioFilename).replace(/\\/gi, "/");
        const voiceUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`
        const seconds = await audioSeconds(voiceUrl);
        const time = getTime(seconds);

         const addPartOrder = await GaragePartsOrdersModel.create({
            publisher: publisher,
            garageID: garageID,
            clientID: clientID,
            projectID,
            images,
            time,
            voiceAddress,
            title,
            description,
         });
         return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
              message: "درخواست تامین قطعه ثبت شد منتظر دریافت پیشنهاد تامین کنندگان باشید"
            }
        });
    } catch (error) {
        next(error)
    }
   }

   async sendSelectedRequestsToClient(req, res, next){
    try {
        const partorderID = req.params;
        const allSupplyReqs = await this.findPartOrderById(partorderID);
        const {suggestionSupplyRequestsIDs} = req.body.suggestionSupplyRequestsIDs; // ارایه ای از ایدی ها
        const matchingReqs = allSupplyReqs.SupplyRequestsForThisOrder.filter(RequestedForSupply => 
            suggestionSupplyRequestsIDs.includes(RequestedForSupply._id.toString())
            );
        const addSuggestionSupplyReqs = await ProjectsModel.findByIdAndUpdate({_id: projectID},
            {$push: {
                "suggestionSupplyRequests": matchingReqs
            }
        });
     // پیشنهادات مورد نظر مکانیک به فیلد ساجسشن سپلای رکویست اضافه کردیم حالا سمت مشتری 
     // فقط به پروژه کویری میزنیم و اینها رو دریافت میکنیم

     return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data: {
          message: "درخواست های تامین قطعه منتخب به مشتری ارسال شد"
        }
    });

    } catch (error) {
        next(error)
    }
   }

   async notifyThatClientChooseOneSupplyReqs(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }
 

//////////////////////////////////////////////////////////////////////////////////
   async findPartOrderById(partorderID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: partorderID });
    const partOrder = await GaragePartsOrdersModel.findById(id);
    if (!partOrder) throw new createError.NotFound("سفارشی یافت نشد")
    return partOrder
  
     }

 }

module.exports = {
    GaragePartOrdersController: new GaragePartOrdersController()
}