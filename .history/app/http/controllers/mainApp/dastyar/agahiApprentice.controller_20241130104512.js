const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const {apprenticeNoticeService} = require("../../../services/mainApp/dastyar/noticeServices/notice.service");
const {conversationService} = require("../../../services/mainApp/dastyar/noticeServices/conversation.service");
const {complaintServices} = require("../../../services/mainApp/dastyar/noticeServices/complaint.service");
const {transactionService} = require("../../../services/mainApp/dastyar/noticeServices/transaction.service");
const {coworkService} = require("../../../services/mainApp/dastyar/noticeServices/coWork.service");const { deleteFilesInPublicForOrders } = require("../../../../utils/functions");

class ApprenticeshipNoticeController extends Controller {
    async createNewNoticeApprentice(req, res, next) {
        try {
            const result = await apprenticeNoticeService.createNewNoticeApprentice(
                req.user,
                req.body,
                req.params,
                req.files
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "آگهی درخواست شاگرد با موفقیت ثبت شد",
                    notice: result.notice,
                    share: result.share
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async getAllNoticeApprentice(req, res, next) {
        try {
            const notices = await apprenticeNoticeService.getAllNoticeApprentice(req.query.city);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { notices }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOneNoticeApprenticeById(req, res, next) {
        try {
            const notice = await apprenticeNoticeService.getOneNoticeApprenticeById(req.params.noticeApprenticeId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeNoticeApprenticeById(req, res, next) {
        try {
            await apprenticeNoticeService.removeNoticeApprenticeById(req.params.noticeApprenticeId, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "آگهی با موفقیت حذف شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async editNoticeApprenticesById(req, res, next) {
        try {
            const updatedNotice = await apprenticeNoticeService.editNoticeApprenticesById(
                req.params.noticeApprenticeId,
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
            const isAdded = await apprenticeNoticeService.toggleBookmark(
                req.params.noticeApprenticeId,
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

    async getAllGarageNoticeApprentices(req, res, next) {
        try {
            // همهی اگهی های شاگرد منتج به همکاری شده گاراژ تاریخچه اش چون اونهایی که 
            //منتج به همکاری نشند بعد مدتی از دیتابیس حذف میشن
            const { notices, total } = await apprenticeNoticeService.getAllGarageNoticeApprentices(
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

    async getAllNoticeApprenticesToItself(req, res, next) {
        try { // همه ی پروژه های تعریف شده از نوع شاگرد که این شخص به عنوان شاگرد درش همکاری داشته
            const { requests, total } = await apprenticeNoticeService.getAllNoticeApprenticesToItself(
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

    async getApprenticeAllActiveApprenticeNoticeApps(req, res, next) {
        try {
            // همکاری های درخواست شاگرد جاری و فعال شخص به عنوان شاگرد
            const { activeNotices, total } = await apprenticeNoticeService.getApprenticeAllActiveNotices(
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

    async getGarageAllActiveApprenticeNoticeApps(req, res, next) {
        try {
            // همکاری های درخواست شاگرد جاری و فعال شخص به عنوان گاراژ
            const { activeNotices, total } = await apprenticeNoticeService.getGarageAllActiveNotices(
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

    async shareNoticeApprentice(req, res, next) {
        try {
            const share = await apprenticeNoticeService.shareNoticeApprentice(
                req.params.noticeApprenticeId,
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

    async addCoworkReqForNoticeApprentice(req, res, next) {
        try {
            // ثبت درخواست همکاری از طرف شاگرد
            const noticeApprenticeAppReqs = await coworkService.apprentice.addCoworkRequest(
                req.user,
                req.params.noticeApprenticeId,
                req.params.apprenticeId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeApprenticeAppReqs }
            });
        } catch (error) {
            next(error);
        }
    }

    async showCoworkRequestsForRequesterGarage(req, res, next) {
        try {
            // نمایش درخواست ها امکان مشاهده پروفایل شخص و بررسی رزومه و درنهایت
            // انتخاب شخص برای همکاری
            const requests = await coworkService.apprentice.showCoworkRequests(req.user.ownedGarage?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { requests }
            });
        } catch (error) {
            next(error);
        }
    }

    async addApprenticeToRequest(req, res, next) {
        try {
            // هندلر انتخاب و افزودن شاگرد به اگهی و پروژه توسط گاراژ
            const result = await coworkService.apprentice.addCollaboratorToRequest(
                req.user,
                req.params.apprenticeId,
                req.params.noticeApprenticeId,
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

    async deleteThisApprenticeFromNoticeApprentice(req, res, next) {
        try {
            await coworkService.apprentice.removeCollaboratorFromRequest(
                req.user.ownedGarage?.id,
                req.params.noticeApprenticeId,
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

    async apprenticeRefusingFromThisNoticeApprenticeship(req, res, next) {
        try {
            //استعفای شاگرد از همکاری پس از پذیرشش توسط گاراژ
            await coworkService.apprentice.collaboratorRefuseRequest(
                req.params.noticeApprenticeId,
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
            //تایید با موفقیت انجام شدن پروژه و دریافت مطالبات از طرف شاگرد و گاراژ
            const role = req.user.apprenticeAt ? 'apprentice' : 'garageOwner';
            await transactionService.apprentice.confirmTransactionCompletion(
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
            // ثبت شکایت از انجام نشدن تعهدات مالی یا وظایف کاری توسط طرفین
            await complaintServices.apprentice.createComplaint(
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
            // پشیمانی از شکایت و لغو شکایت توسط ایجاد کننده شکایت
            await complaintServices.apprentice.removeComplaint(
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
            // عکس العمل و پاسخ و مستندات شخص مشتک علیه در جواب شاکی
            const updatedComplaint = await complaintServices.apprentice.respondToComplaint(
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

    async addReviewForNoticeApprentice(req, res, next) {
        try {
            // ثبت کامنت نظر امتیاز توسط طرفین همکاری به یکدیگر در این همکاری
            await transactionService.apprentice.addReview(
                req.user,
                req.params.noticeApprenticeId,
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
            // ایجاد اتاق دایرکت مسج برای ارتباط طرفین همکاری با یکدیگر
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
    ApprenticeshipNoticeController: new ApprenticeshipNoticeController()
};