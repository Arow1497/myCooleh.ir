/*
* نکته بسیار مهم در کد نویسی تمیز اینه که اسم کنترلر ها نباید طولانی باشه 
* اسم های کوتاه بزار با یک لاین کامنت مثلا:
* 1. Car Inspection Sheet With Required Parts And Images For Sending To Client To Approval
* async carInspection(req, res, next){
*/    
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const {dastyarNoticeService} = require("../../../services/mainApp/dastyar/noticeServices/notice.service");
const {conversationService} = require("../../../services/mainApp/dastyar/noticeServices/conversation.service");
const {complaintService} = require("../../../services/mainApp/dastyar/noticeServices/complaint.service");
const {transactionService} = require("../../../services/mainApp/dastyar/noticeServices/transaction.service");
const {coworkService} = require("../../../services/mainApp/dastyar/noticeServices/coWork.service");
const { deleteFilesInPublicForOrders } = require("../../../../utils/functions");

class DivarNoticeController extends Controller {
    async createNewNoticeDastyar(req, res, next) {
        try {
            const result = await dastyarNoticeService.createNewNoticeDastyar(
                req.user,
                req.body,
                req.params,
                req.files
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "آگهی درخواست مکانیک با موفقیت ثبت شد",
                    notice: result.notice,
                    share: result.share
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async getAllNoticeDastyar(req, res, next) {
        try {
            const notices = await dastyarNoticeService.getAllNoticeDastyar(req.query.city);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { notices }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOneNoticeDastyarById(req, res, next) {
        try {
            const notice = await dastyarNoticeService.getOneNoticeDastyarById(req.params.noticeDastyarId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeNoticeDastyarById(req, res, next) {
        try {
            await dastyarNoticeService.removeNoticeDastyarById(req.params.noticeDastyarId, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "آگهی با موفقیت حذف شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async editNoticeDastyarsById(req, res, next) {
        try {
            const updatedNotice = await dastyarNoticeService.editNoticeDastyarsById(
                req.params.noticeDastyarId,
                req.user.id,
                req.body,
                req.files
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "آگهی با موفقیت بروزرسانی شد",
                    notice: updatedNotice
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async toggleBookmark(req, res, next) {
        try {
            const isAdded = await dastyarNoticeService.toggleBookmark(
                req.params.noticeDastyarId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: isAdded 
                        ? "آگهی به علاقه‌مندی‌های شما اضافه شد"
                        : "آگهی از علاقه‌مندی‌های شما حذف شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllGarageNoticeDastyars(req, res, next) {
        try {
            const { notices, total } = await dastyarNoticeService.getAllGarageNotices(
                req.user,
                req.query.page,
                req.query.limit
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    notices,
                    pagination: {
                        total,
                        pages: Math.ceil(total / req.query.limit),
                        currentPage: parseInt(req.query.page),
                        perPage: parseInt(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllNoticeDastyarsToItself(req, res, next) {
        try {
            const { requests, total } = await dastyarNoticeService.getAllNoticeDastyarsToItself(
                req.user.id,
                req.query.page,
                req.query.limit,
                req.query.status
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    requests,
                    pagination: {
                        total,
                        pages: Math.ceil(total / req.query.limit),
                        currentPage: parseInt(req.query.page),
                        perPage: parseInt(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getMechanicAllActiveDastyarNotice(req, res, next) {
        try {
            const { activeNotices, total } = await dastyarNoticeService.getMechanicAllActiveNotices(
                req.user.id,
                req.query.page,
                req.query.limit
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    activeNotices,
                    pagination: {
                        total,
                        pages: Math.ceil(total / req.query.limit),
                        currentPage: parseInt(req.query.page),
                        perPage: parseInt(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getGarageAllActiveDastyarNotice(req, res, next) {
        try {
            const { activeNotices, total } = await dastyarNoticeService.getGarageAllActiveNotices(
                req.user,
                req.query.page,
                req.query.limit
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    activeNotices,
                    pagination: {
                        total,
                        pages: Math.ceil(total / req.query.limit),
                        currentPage: parseInt(req.query.page),
                        perPage: parseInt(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async shareNoticeDastyar(req, res, next) {
        try {
            const share = await dastyarNoticeService.shareNoticeDastyar(
                req.params.noticeDastyarId,
                req.user
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { share }
            });
        } catch (error) {
            next(error);
        }
    }

    async addCoworkReqForNoticeDastyar(req, res, next) {
        try {
            const noticeDastyarAppReqs = await coworkService.dastyar.addCoworkRequest(
                req.user,
                req.params.noticeDastyarId,
                req.params.mechanicId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeDastyarAppReqs }
            });
        } catch (error) {
            next(error);
        }
    }

    async showCoworkRequestsForRequesterGarage(req, res, next) {
        try {
            const requests = await coworkService.dastyar.showCoworkRequests(req.user.ownedGarage?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { requests }
            });
        } catch (error) {
            next(error);
        }
    }

    async addMechanicToRequest(req, res, next) {
        try {
            const result = await coworkService.dastyar.addCollaboratorToRequest(
                req.user,
                req.params.mechanicId,
                req.params.noticeDastyarId,
                req.body
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "مکانیک موردنظر به پروژه افزوده شد",
                    result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisMechanicFromNoticeDastyar(req, res, next) {
        try {
            await coworkService.dastyar.removeCollaboratorFromRequest(
                req.user.ownedGarage?.id,
                req.params.noticeDastyarId,
                req.params.mechanicId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "مکانیک موردنظر از پروژه حذف شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async mechanicRefusingFromThisNoticeDastyarship(req, res, next) {
        try {
            await coworkService.dastyar.collaboratorRefuseRequest(
                req.params.noticeDastyarId,
                req.user.id
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
            const role = req.user.mechanicAt ? 'mechanic' : 'garageOwner';
            await transactionService.dastyar.confirmTransactionCompletion(
                req.params.transactionId,
                req.user.id,
                role
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "این همکاری از سمت شما با موفقیت پایان یافت"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async createComplaint(req, res, next) {
        try {
            await complaintService.dastyar.createComplaint(
                req.params.transactionId,
                req.user.id,
                req.user.role,
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
            await complaintService.dastyar.removeComplaint(
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
            const updatedComplaint = await complaintService.dastyar.respondToComplaint(
                req.params.complaintId,
                req.user.id,
                req.body,
                req.files
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

    async addReviewForNoticeDastyar(req, res, next) {
        try {
            await transactionService.dastyar.addReview(
                req.user,
                req.params.noticeDastyarId,
                req.body
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

    async createTransactionRoom(req, res, next) {
        try {
            const conversation = await conversationService.createTransactionRoom(
                req.params.transactionId,
                req.user.id
            );
            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "اتاق گفتگو با موفقیت ایجاد شد",
                    conversationId: conversation.id
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req, res, next) {
        try {
            const message = await conversationService.sendMessage(
                req.params.conversationId,
                req.user.id,
                req.body,
                req.files
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پیام با موفقیت ارسال شد",
                    messageData: message
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getMessages(req, res, next) {
        try {
            const { messages, totalMessages } = await conversationService.getMessages(
                req.params.conversationId,
                req.user.id,
                req.query.page,
                req.query.limit
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    messages,
                    pagination: {
                        currentPage: Number(req.query.page),
                        totalPages: Math.ceil(totalMessages / req.query.limit),
                        totalMessages,
                        limit: Number(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserConversations(req, res, next) {
        try {
            const { conversations, totalConversations } = await conversationService.getUserConversations(
                req.user.id,
                req.query.page,
                req.query.limit,
                req.query.status
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    conversations,
                    pagination: {
                        currentPage: Number(req.query.page),
                        totalPages: Math.ceil(totalConversations / req.query.limit),
                        totalConversations,
                        limit: Number(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async markMessagesAsRead(req, res, next) {
        try {
            const { count } = await conversationService.markMessagesAsRead(
                req.params.conversationId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: count > 0 
                        ? "پیام‌ها به عنوان خوانده شده علامت‌گذاری شدند"
                        : "پیام ناخوانده‌ای وجود ندارد",
                    count
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getConversationDetails(req, res, next) {
        try {
            const conversationDetails = await conversationService.getConversationDetails(
                req.params.conversationId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    conversation: conversationDetails
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    DivarNoticeController: new DivarNoticeController()
};