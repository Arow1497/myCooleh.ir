const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const noticeService = require("../services/notice.service");

class AgahiEstNiazController extends Controller {
    async createNoticeGarageRequirments(req, res, next) {
        try {
            const notice = await noticeService.createNotice(
                'noticeGarageRequirments',
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { noticeGarageRequirments: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllNoticeGarageRequirmentss(req, res, next) {
        try {
            const { page, limit, sortBy, order } = req.query;
            const result = await noticeService.getAllNotices(
                'noticeGarageRequirments',
                page,
                limit,
                sortBy,
                order
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeGarageRequirmentss: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOneNoticeGarageRequirmentsById(req, res, next) {
        try {
            const notice = await noticeService.getNoticeById(
                'noticeGarageRequirments',
                req.params.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeGarageRequirments: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async editNoticeGarageRequirmentsById(req, res, next) {
        try {
            const notice = await noticeService.updateNotice(
                'noticeGarageRequirments',
                req.params.id,
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeGarageRequirments: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeNoticeGarageRequirmentsById(req, res, next) {
        try {
            await noticeService.deleteNotice(
                'noticeGarageRequirments',
                req.params.id,
                req.user.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "NoticeGarageRequirments deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarkedPostsByUserId(req, res, next) {
        try {
            const result = await noticeService.getBookmarkedPostsByUserId(
                'noticeGarageRequirments',
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

    async searchNoticeGarageRequirmentss(req, res, next) {
        try {
            const { q, page, limit } = req.query;
            const result = await noticeService.searchNotices(
                'noticeGarageRequirments',
                q,
                page,
                limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeGarageRequirmentss: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async reportNoticeGarageRequirments(req, res, next) {
        try {
            const report = await noticeService.reportNotice(
                'noticeGarageRequirments',
                req.params.noticeGarageRequirmentsId,
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

    async bookmarkNoticeGarageRequirments(req, res, next) {
        try {
            const bookmark = await noticeService.bookmarkNotice(
                req.params.noticeGarageRequirmentsId,
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

    async shareNoticeGarageRequirments(req, res, next) {
        try {
            const share = await noticeService.shareNotice(
                'noticeGarageRequirments',
                req.params.noticeGarageRequirmentsId,
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

module.exports = new AgahiEstNiazController();