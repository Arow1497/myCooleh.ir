const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const noticeService = require("../../../services/mainApp/forums/notice.service");

class AgahiTaminController extends Controller {
    async createNoticeTaminGhete(req, res, next) {
        try {
            const notice = await noticeService.createNotice(
                'noticeTaminGhete',
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { noticeTaminGhete: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllNoticeTaminGhetes(req, res, next) {
        try {
            const { page, limit, sortBy, order } = req.query;
            const result = await noticeService.getAllNotices(
                'noticeTaminGhete',
                page,
                limit,
                sortBy,
                order
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeTaminGhetes: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOneNoticeTaminGheteById(req, res, next) {
        try {
            const notice = await noticeService.getNoticeById(
                'noticeTaminGhete',
                req.params.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeTaminGhete: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async editNoticeTaminGheteById(req, res, next) {
        try {
            const notice = await noticeService.updateNotice(
                'noticeTaminGhete',
                req.params.id,
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeTaminGhete: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeNoticeTaminGheteById(req, res, next) {
        try {
            await noticeService.deleteNotice(
                'noticeTaminGhete',
                req.params.id,
                req.user.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "NoticeTaminGhete deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarkedNoticesByUserId(req, res, next) {
        try {
            const result = await noticeService.getBookmarkedNotiocesByUserId(
                'noticeTaminGhete',
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

    async searchNoticeTaminGhetes(req, res, next) {
        try {
            const { q, page, limit } = req.query;
            const result = await noticeService.searchNotices(
                'noticeTaminGhete',
                q,
                page,
                limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeTaminGhetes: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async reportNoticeTaminGhete(req, res, next) {
        try {
            const report = await noticeService.reportNotice(
                'noticeTaminGhete',
                req.params.noticeTaminGheteId,
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

    async bookmarkNoticeTaminGhete(req, res, next) {
        try {
            const bookmark = await noticeService.bookmarkNotice(
                req.params.noticeTaminGheteId,
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

    async shareNoticeTaminGhete(req, res, next) {
        try {
            const share = await noticeService.shareNotice(
                'noticeTaminGhete',
                req.params.noticeTaminGheteId,
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
    AgahiTaminController : new AgahiTaminController()
}