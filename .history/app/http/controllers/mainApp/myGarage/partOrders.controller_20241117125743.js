const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const GaragePartOrdersService = require("../services/GaragePartOrders.service");

class GaragePartOrdersController extends Controller {
     // Controller methods
     //اگهی هایی که ثبت میشن باید لوکیشن داشته باشن و یدکی های محدوده ۱۰ ۲۰ کیلومتری 
     //بتونن ببینن اگر قطعات نایاب بود گزینه پیشنهاد به کل یدکی ها وجود داشته باشه
     async addEstimatedBrokenSectionsWithRequiredPartsForClientApprovalByGarage(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async updateEstimatedBrokenSectionsWithRequiredPartsForClientApprovalByGarage(req, res, next){
        try {
            // گاهی اوقات یک لیستی از معایب و قطعاتی که نیاز هست تهیه میشه و کلاینت موادی رو تایید میده
            // بهد توی کار میرن میبینن ایراد های جدیدی مشخص میشه اونموقع یکبار دیگه این رو یه 
            //آپدیت میزنن و مشتری باز باید تایید کنه یا خیر
        } catch (error) {
            
        }
    }

    async chooseAllowedPartsByClient(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async sendChoosenSupplyReqsToClientForChoosing(req, res, next){
    try {
        
    } catch (error) {
        
    }
    }

    async chosingFinalSupplyReqByClient(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async createPartOrder(req, res, next) {
        try {
            const result = await GaragePartOrdersService.createPartOrder(
                req.user,
                req.body,
                req.params,
                req.files
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "درخواست تامین قطعه با موفقیت ثبت شد",
                    orders: result.orders,
                    share: result.share
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async sendSelectedRequestsToClient(req, res, next) {
        try {
            await GaragePartOrdersService.sendSelectedRequestsToClient(req.body);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "درخواست‌های انتخاب شده به مشتری ارسال شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async notifyThatClientChooseOneSupplyReqs(req, res, next) {
        try {
            await GaragePartOrdersService.notifyClientChoice(req.body);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "انتخاب مشتری ثبت شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllPartOrderReqs(req, res, next) {
        try {
            const orders = await GaragePartOrdersService.getAllPartOrderReqs(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { orders }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOnePartOrderReqById(req, res, next) {
        try {
            const orders = await GaragePartOrdersService.getOnePartOrderReqById(req.params.partOrderId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { orders }
            });
        } catch (error) {
            next(error);
        }
    }

    async removePartOrderReqById(req, res, next) {
        try {
            await GaragePartOrdersService.removePartOrderReqById(req.params.partOrderId, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "سفارش قطعه با موفقیت حذف شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async editPartOrderReqById(req, res, next) {
        try {
            const updatedOrder = await GaragePartOrdersService.editPartOrderReqById(
                req.params.partOrderId,
                req.user.id,
                req.body,
                req.files
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "سفارش قطعه با موفقیت بروزرسانی شد",
                    orders: updatedOrder
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async toggleBookmark(req, res, next) {
        try {
            const result = await GaragePartOrdersService.toggleBookmark(
                req.params.partOrderId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: result.message }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllGaragePartOrderReqs(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getAllGaragePartOrderReqs(req.user, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllSupplierStorePartOrderRequestsToItself(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getAllSupplierStorePartOrderRequestsToItself(
                req.user.id,
                req.query
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getGarageAllActivePartOrdersRequests(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getGarageAllActivePartOrdersRequests(req.user, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getSupplierStoreAllActivePartOrderReqs(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getSupplierStoreAllActivePartOrderReqs(
                req.user.id,
                req.query
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async sharePartOrderRequest(req, res, next) {
        try {
            const result = await GaragePartOrdersService.sharePartOrderRequest(
                req.params.partOrderId,
                req.user
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async addCoworkReqForPartOrderReqFromSupplierStore(req, res, next) {
        try {
            const result = await GaragePartOrdersService.addCoworkReqForPartOrderReqFromSupplierStore(
                req.user,
                req.params.partOrderId,
                req.params.apprenticeId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { ordersApprenticeAppReqs: result }
            });
        } catch (error) {
            next(error);
        }
    }

    async showSuplierStorePartOrderRequestsForRequesterGarage(req, res, next) {
        try {
            const requests = await GaragePartOrdersService.showSuplierStorePartOrderRequestsForRequesterGarage(
                req.user?.ownedGarage?.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { requests }
            });
        } catch (error) {
            next(error);
        }
    }

    async addSupplierStoreToPartOrderRequest(req, res, next) {
        try {
            const result = await GaragePartOrdersService.addSupplierStoreToPartOrderRequest(
                req.user,
                req.params,
                req.body
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شاگرد موردنظر به پروژه افزوده شد",
                    result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisSupplierStoreFromPartOrderRequest(req, res, next) {
        try {
            await GaragePartOrdersService.deleteSupplierStoreFromPartOrderRequest(
                req.user?.ownedGarage?.id,
                req.params.partOrderId,
                req.params.apprenticeId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شاگرد موردنظر از پروژه حذف شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisSupplierStoreFromPartOrderRequestByClient(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async supplierStoreRefusingFromThisPartOrderReq(req, res, next) {
        try {
            await GaragePartOrdersService.supplierStoreRefusingFromPartOrderReq(
                req.user.id,
                req.params.partOrderId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شما از این همکاری با موفقیت استعفا دادید"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async confirmTransactionCompletion(req, res, next) {
        try {
            await GaragePartOrdersService.confirmTransactionCompletion(
                req.params.transactionId,
                req.user.id,
                req.user.apprenticeAt ? 'apprentice' : 'garageOwner'
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "این همکاری از سمت شما با موفقیت پایان یافت" }
            });
        } catch (error) {
            next(error);
        }
    }

    async createComplaint(req, res, next) {
        try {
            await GaragePartOrdersService.createComplaint(
                req.params,
                req.user,
                req.body,
                req.files
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شکایت شما از طرف همکاری ثبت شد برای بررسی و حصول نتیجه صبور باشید"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeAndRegretComplaintByrequester(req, res, next) {
        try {
            await GaragePartOrdersService.removeAndRegretComplaint(
                req.params.complaintId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شکایت شما با موفقیت لغو شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async respondToComplaint(req, res, next) {
        try {
            const updatedComplaint = await GaragePartOrdersService.respondToComplaint(
                req.params.complaintId,
                req.user.id,
                req.body.response,
                req.files,
                req.body.fileUploadPath
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما به شکایت ثبت شد",
                    complaint: updatedComplaint
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async addReviewForApprenticeRequest(req, res, next) {
        try {
            //نظر و امتیاز گاراژ و یدکی و مشتری هر سه با همین هندلر ثبت بشه
            // طبیعتا آپسرت و آپدیت و کریت باید باشه
            await GaragePartOrdersService.addReviewForApprenticeRequest(
                req.params,
                req.body,
                req.user
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "باتشکر...نظر و امتیاز شما برای این همکاری ثبت شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // add General conversation service 
}

module.exports = {
    GaragePartOrdersController: new GaragePartOrdersController()
};