const Controller = require("../controller");

class ComprehensivePwaAppController extends Controller {
  // Private helper methods
  async #findProjectById(projectId) {
    const schema = publicValidators.getValidationSchema({
        id: publicValidators.id
    });    
    const { id } = await schema.validateAsync({ id: projectId });
    const project = await prisma.project.findUnique({
        where: {
            id: id,
        },
    });
    if (!project) throw new createError.NotFound("چنین پروژه ای یافت نشد")
    return project
  }

    // Controller methods
 

    async garageClientAcceptance(req, res, next) {
        try {
          const connectingDataBody = await garagesSchema.validateAsync(req.body);
          const { carModel, carChassisNumber, carBuildYear, carPlateNumber, garageSerialNumber } = connectingDataBody;
          const client_ID = req.client._id;
      
          const findGarage = await prisma.garage.findUnique({
            where: {
              garageSerialNumber: garageSerialNumber,
            },
          });
      
          if (!findGarage) {
            throw createError.InternalServerError("شماره سریال گاراژ نادرست است");
          }
      
          await prisma.garageAwaitList.create({
            data: {
              clientId: client_ID,
              garageId: findGarage.id,
              carModel,
              carPlateNumber,
              carChassisNumber,
              carBuildYear,
            },
          });
      
          return res.status(201).json({
            statusCode: 201,
            data: {
              message: "درخواست پذیرش به گاراژ ارسال شد",
            },
          });
        } catch (error) {
          next(error);
        }
      }
    
      async showSuggestionSupplyPartReqsToClient(req, res, next) {
        try {
          const clientID = req.client._id;
          const projectID = parseInt(req.params.id); // Assuming projectID is an integer in params
      
          const checkExist = await prisma.project.findUnique({
            where: {
              id: projectID,
            },
          });
      
          if (!checkExist || checkExist.clientId !== clientID) {
            throw createError.NotAcceptable("نمایش پیشنهادات تامین قطعه فقط برای کارفرمای آن مجاز است");
          }
      
          const showSuggestedRrqs = await prisma.project.findUnique({
            where: {
              id: projectID,
            },
            select: {
              suggestionSupplyRequests: true,
            },
          });
      
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
              showSuggestedRrqs,
            },
          });
        } catch (error) {
          next(error);
        }
      }
      
      async selectThisSupplyRequestByClient(req, res, next) {
        try {
          // Assuming RequestedForSupplyID and supplierStoreID are available in req.params as integers
          const RequestedForSupplyID = parseInt(req.params.requestedForSupplyID);
          const supplierStoreID = parseInt(req.params.supplierStoreID);
          const clientID = req.client._id;
          const projectID = parseInt(req.params.id); 
      
          const checkExist = await prisma.project.findUnique({
            where: {
              id: projectID,
            },
          });
      
          if (!checkExist || checkExist.clientId !== clientID) {
            throw createError.NotAcceptable("ثبت تغییرات تامین قطعه فقط برای کارفرمای آن مجاز است");
          }
      
          await prisma.project.update({
            where: {
              id: projectID,
            },
            data: {
              supplierStoreID: {
                push: supplierStoreID, // Ensure matchingReqs is defined and contains the correct value
              },
            },
          });
      
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
              message: "انتخاب تامین کننده انجام شد برای تسویه حساب هماهنگی های لازم را با مکانیک خود انجام دهید",
            },
          });
        } catch (error) {
          next(error);
        }
      } // اینجا باید یک پوش نوتیفیکیشن برای مکاینیک بره که مشتری تامین کننده
       // رو انتخاب کرد تسویه حساب رو انجام بده
       
}

module.exports = {
    ComprehensivePwaAppController : new ComprehensivePwaAppController()
}
// اپلیکیشن pwa مشتریان ما 
// یک اپلیکیشن جامع و کامل پی دبلیو ای هست مثل نسخه های pwa
//اسنپ و غیره که ما قرار هست تمام سوابق تعمیر سوابق سرویس و ارایه پیشنهاد خرید
//به مشتریان رو داخلش داشته باشیم نه صرفا یک اپلیکیشن که برای صرفا پذیرش در گاراژ استفاده بشه