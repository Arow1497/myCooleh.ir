const createError = require("http-errors");
const { ProjectsModel } = require("../../../../models/Garages/projects");
const Controller = require("../../controller");
const { StatusCodes:  HttpStatus} = require("http-status-codes");

class AdminCarshenasiRecordsController extends Controller{

    async getCarHistoryRecordsInquiry(req, res, next){
        try {
          const carChassisNumber = req.body;
          const findHistory = await ProjectsModel.findOne({chassisNumber: carChassisNumber});
          if(!findHistory) throw createError.NotFound("با عرض پوزش خودرو با این مشخصات در بانک اطلاعاتی کوله ثبت نشده");
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
             findHistory
            }
          });
        } catch (error) {
            next(error)
        }
    }

    async getCarAllHistoryRecordsDetails(req, res, next){
        try {
          const carChassisNumber = req.body;
          const findHistory = await ProjectsModel.findOne({chassisNumber: carChassisNumber})
          .populate(
         {      },
         {     }
          );
          
          return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
             findHistory
            }
          });
        } catch (error) {
            next(error)
        }
    }
}
module.exports = {
    AdminCarshenasiRecordsController: new AdminCarshenasiRecordsController()
}