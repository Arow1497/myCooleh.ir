/*
*اگهی های همکاری برونسپاری از این نظر بسیار مهم هستن که در واقع دارند مشتری فعال رو به گاراژ متصل میکنند
*به اینصورت که گاراژ و مکانیک نقصی در بدنه یا فنی یک ماشین شناسایی میکنن که در تخصصشون نیست و بعد ازینکه
*کار تعمیراتی خودشون رو انجام دادن این مشتری رو وصل میکنن به گاراژ های دیگه و سهمی برمیدارن..
*پلتفرم باید اپروو کنه که ایا این مشتری رفته پیش اون گاراژ یا نه ازینجا که اون پروژه اونطرف تعریف میشه
*میتونه هر خدماتی باشه صافکاری دیتیلینگ برق و باطری همه چی تعویض روغن چیزی که توی این نوع 
*اگهی ها مهم هست چون مشتری باید مراجعه کنع به گاراژ پدیرنده مسافت هست که باید مسافت کم باشه بین دو گاراژ 
*یعنی میدلور موارد نزدیک باید روی این اگهی باشه
*/

const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const {outsourcingNoticeService} = require("../../../services/mainApp/dastyar/noticeServices/notice.service")
const {conversationService} = require("../../../services/mainApp/dastyar/noticeServices/conversation.service");
const {complaintService} = require("../../../services/mainApp/dastyar/noticeServices/complaint.service");
const {transactionService} = require("../../../services/mainApp/dastyar/noticeServices/transaction.service");
const {coworkService} = require("../../../services/mainApp/dastyar/noticeServices/coWork.service");
const { deleteFilesInPublicForOrders } = require("../../../../utils/functions");


class OutSourcingNoticeController extends Controller {

    /********************************************************
     * 1. Creating New Dastyar Notice
     *******************************************************/
    async createNewNoticeOutSourcing(req, res, next) {
        try {
            const result = await outsourcingNoticeService.createNewNoticeOutSourcing(
                req.user,
                req.body,
                req.params,
                req.files
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "آگهی درخواست همکاری با گاراژهای دیگر با موفقیت ثبت شد",
                    notice: result.notice,
                    share: result.share
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    /********************************************************
     * 2. Showing List Of All Approved Dastyar Notices In User Feed
     *******************************************************/
    async getAllNoticeOutSourcing(req, res, next) {
        try {
            const notices = await outsourcingNoticeService.getAllNoticeOutSourcing(req.query.city);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { notices }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 3. Showing This Specific Dastyar Notice From Feed
     ******************************************************/
    async getOneNoticeOutSourcingById(req, res, next) {
        try {
            const notice = await outsourcingNoticeService.getOneNoticeOutSourcingById(req.params.noticeOutSourcingId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { notice }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 4. Removing This Specific Dastyar Notice By It's Publisher
     ******************************************************/
    async removeNoticeOutSourcingById(req, res, next) {
        try {
            await outsourcingNoticeService.removeNoticeOutSourcingById(req.params.noticeOutSourcingId, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "آگهی با موفقیت حذف شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 5. Edit and Update This Specific Dastyar Notice By It's Publisher
     ******************************************************/
    async editNoticeOutSourcingsById(req, res, next) {
        try {
            const updatedNotice = await outsourcingNoticeService.editNoticeOutSourcingsById(
                req.params.noticeOutSourcingId,
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

    /*******************************************************
     * 6. Bookmark This Specific Datyar Notice By User
     ******************************************************/
    async toggleBookmark(req, res, next) {
        try {
            const isAdded = await outsourcingNoticeService.toggleBookmark(
                req.params.noticeOutSourcingId,
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

    /*******************************************************
     * 7. History Of All Completed Garage's Recorded Dastyar Notices
     ******************************************************/
    async getAllGarageNoticeOutSourcings(req, res, next) {
        try {
            const { notices, total } = await outsourcingNoticeService.getAllGarageNoticeOutSourcings(
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

    /*******************************************************
     * 8. History Of All Completed Mechanic's Recorded Datyar Notices
     ******************************************************/
    async getAllNoticeOutSourcingsToItself(req, res, next) {
        try {
            const { requests, total } = await outsourcingNoticeService.getAllNoticeOutSourcingsToItself(
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

    /*******************************************************
     * 9. Show All Of In-Progress Mechanic's Approved Dastyar Notices
     ******************************************************/
    async getAcceptorGarageAllActiveOutSourcingNotice(req, res, next) {
        try {
            const { activeNotices, total } = await outsourcingNoticeService.getAcceptorGarageAllActiveNotices(
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

    /*******************************************************
     * 10. Show All Of In-Progress Garage's Approved Dastyar Notices
     ******************************************************/
    async getGarageAllActiveOutSourcingNoticeApps(req, res, next) {
        try {
            const { activeNotices, total } = await outsourcingNoticeService.getGarageAllActiveNotices(
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

    /*******************************************************
     * 11. Sharing This Specific Dastyar Notice By User
     ******************************************************/
    async shareNoticeOutSourcing(req, res, next) {
        try {
            const share = await outsourcingNoticeService.shareNoticeOutSourcing(
                req.params.noticeOutSourcingId,
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

    /*******************************************************
     * 12. Adding CoWorking Request To This Specific Dastyar Notice By Garages Or Mechanic
     ******************************************************/
    async addCoworkReqForNoticeOutSourcing(req, res, next) {
        try {
            const noticeOutSourcingAppReqs = await coworkService.outsourcing.addCoworkRequest(
                req.user,
                req.params.noticeOutSourcingId,
                req.params.acceptorGarageId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeOutSourcingAppReqs }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 13. Show All Of CoWorking Requests To This Specific Dastyar Notice To It's Publisher
     ******************************************************/
    async showCoworkRequestsForRequesterGarage(req, res, next) {
        try {
            const requests = await coworkService.outsourcing.showCoworkRequests(req.user.ownedGarage?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { requests }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 14. Choosing This Mechanic As Collaborator By Dastyar Notice's Publisher
     ******************************************************/
    async addAcceptorGarageToRequest(req, res, next) {
        try {
            const result = await coworkService.outsourcing.addCollaboratorToRequest(
                req.user,
                req.params.acceptorGarageId,
                req.params.noticeOutSourcingId,
                req.body
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "گاراژ موردنظر به پروژه افزوده شد",
                    result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 15. Removing This Mechanic From CoWorking By Dastyar Notice's Publisher
     ******************************************************/
    async deleteThisAcceptorGarageFromNoticeOutSourcing(req, res, next) {
        try {
            await coworkService.outsourcing.removeCollaboratorFromRequest(
                req.user.ownedGarage?.id,
                req.params.noticeOutSourcingId,
                req.params.acceptorGarageId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "گاراژ موردنظر از پروژه حذف شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /*******************************************************
     * 16. Mechanic Refusing From This Collaboration
     ******************************************************/
    async acceptorGarageRefusingFromThisNoticeOutSourcingship(req, res, next) {
        try {
            await coworkService.outsourcing.collaboratorRefuseRequest(
                req.params.noticeOutSourcingId,
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

    /*******************************************************
     * 17. Two-Side Confirming For Completion Of This Collaboration
     ******************************************************/
    async confirmTransactionCompletion(req, res, next) {
        try {
            const role = req.user.acceptorGarageAt ? 'acceptorGarage' : 'garageOwner';
            await transactionService.outsourcing.confirmTransactionCompletion(
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

    /*******************************************************
     * 18. Create A Complaining Request From Each Side Of This Collaboration
     ******************************************************/
    async createComplaint(req, res, next) {
        try {
            await complaintService.outsourcing.createComplaint(
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

    /*******************************************************
     * 19. Regret And Remove A Complaint Request By It's Publisher
     ******************************************************/
    async removeAndRegretComplaintByrequester(req, res, next) {
        try {
            await complaintService.outsourcing.removeComplaint(
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

    /*******************************************************
     * 20. Responding To A Complaint By It's Target
     ******************************************************/
    async respondToComplaint(req, res, next) {
        try {
            const updatedComplaint = await complaintService.outsourcing.respondToComplaint(
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

    /*******************************************************
     * 21. Add Rating And Comment For This Collaboration By Two Side Of It
     ******************************************************/
    async addReviewForNoticeOutSourcing(req, res, next) {
        try {
            await transactionService.outsourcing.addReview(
                req.user,
                req.params.noticeOutSourcingId,
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

    /*******************************************************
     * 22. Create A Conversation Space For This Collaboration By Two Side Of It
     ******************************************************/
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

    /*******************************************************
     * 23. Sending Message
     ******************************************************/
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

    /*******************************************************
     * 24. Get All Messages
     ******************************************************/
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

    /*******************************************************
     * 25. Get All Of User Converations
     ******************************************************/
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

    /*******************************************************
     * 26. Mark This Messages As Read
     ******************************************************/
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

    /*******************************************************
     * 27. Get This Conversation Details
     ******************************************************/
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
    OutSourcingNoticeController: new OutSourcingNoticeController()
};