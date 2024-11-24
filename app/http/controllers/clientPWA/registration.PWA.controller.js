const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { garagesSchema } = require("../../validators/MainApp/garages.schema");
const publicValidators = require("../../validators/public.validator");


class PwaRegistrationController extends Controller{
// Private helper methods


    // Controller methods
    async registrationPWA(req, res, next) {
        try {
        const clientDataBody = await createBlogSchema.validateAsync(req.body);
        const { first_name, last_name, carPlateNumber, carBuildYear, carModel, chassisNumber } = clientDataBody;
    
        const data = {};
        if (first_name) data.first_name = first_name;
        if (last_name) data.last_name = last_name;
        if (carPlateNumber) data.carPlateNumber = carPlateNumber;
        if (carBuildYear) data.carBuildYear = carBuildYear;
        if (carModel) data.carModel = carModel;
        if (chassisNumber) data.chassisNumber = chassisNumber;
        data.role = ROLES.CLIENT;
    
        const clientID = req.client.id; // Assuming req.client.id is a string
    
        const registration = await prisma.client.update({
            where: {
            id: clientID,
            },
            data: data, // Directly assign the data object
        });
    
        return res.status(201).json({
            statusCode: 201,
            data: {
            message: "پروفایل مشتری با موفقیت بروز رسانی شد",
            },
        });
        } catch (error) {
        next(error);
        }
    }

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
//////////////////////////////////////////////////////////////////////////
async findProjectById(projectId) {
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
}

module.exports = {
    PwaRegistrationController: new PwaRegistrationController()
}