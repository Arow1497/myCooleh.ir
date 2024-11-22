const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const noticeService = require("../../../services/mainApp/forums/notice.service");

class AgahiEstNiazController extends Controller {
    async createNoticeEstNiaz(req, res, next) {
        try {
            const notice = await noticeService.createNotice(
                'noticeEstNiaz',
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { noticeEstNiaz: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllNoticeEstNiazs(req, res, next) {
        try {
            const { page, limit, sortBy, order } = req.query;
            const result = await noticeService.getAllNotices(
                'noticeEstNiaz',
                page,
                limit,
                sortBy,
                order
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeEstNiazs: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOneNoticeEstNiazById(req, res, next) {
        try {
            const notice = await noticeService.getNoticeById(
                'noticeEstNiaz',
                req.params.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeEstNiaz: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async editNoticeEstNiazById(req, res, next) {
        try {
            const notice = await noticeService.updateNotice(
                'noticeEstNiaz',
                req.params.id,
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeEstNiaz: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeNoticeEstNiazById(req, res, next) {
        try {
            await noticeService.deleteNotice(
                'noticeEstNiaz',
                req.params.id,
                req.user.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "NoticeEstNiaz deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarkedNoticesByUserId(req, res, next) {
        try {
            const result = await noticeService.getBookmarkedNoticesByUserId(
                'noticeEstNiaz',
                req.params.userId,
                req.params.noticeId,
                req.query.page,
                req.query.limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async searchNoticeEstNiazs(req, res, next) {
        try {
            const { q, page, limit } = req.query;
            const result = await noticeService.searchNotices(
                'noticeEstNiaz',
                q,
                page,
                limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeEstNiazs: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async reportNoticeEstNiaz(req, res, next) {
        try {
            const report = await noticeService.reportNotice(
                'noticeEstNiaz',
                req.params.noticeEstNiazId,
                req.user.id,
                req.body.reason,
                req.body.description
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { report }
            });
        } catch (error) {
            next(error);
        }
    }

    async bookmarkNoticeEstNiaz(req, res, next) {
        try {
            const bookmark = await noticeService.bookmarkNotice(
                req.params.noticeEstNiazId,
                req.user.id
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { bookmark }
            });
        } catch (error) {
            next(error);
        }
    }

    async shareNoticeEstNiaz(req, res, next) {
        try {
            const share = await noticeService.shareNotice(
                'noticeEstNiaz',
                req.params.noticeEstNiazId,
                req.user.id,
                req.body.platform,
                req.body.customMessage,
                process.env.FRONTEND_URL
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { share }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    AgahiEstNiazController: new AgahiEstNiazController()
}