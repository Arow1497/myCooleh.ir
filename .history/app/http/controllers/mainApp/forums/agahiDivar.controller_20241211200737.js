const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const noticeService = require("../../../services/mainApp/forums/notice.service");

class AgahiDivarController extends Controller {

    /********************************************************
     * 1. Creating New Apprentice Notice
     *******************************************************/
    async create(req, res, next) {
        try {
            const notice = await noticeService.createNotice(
                'noticeDivar',
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { noticeDivar: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 2. Get List Of All Divar Notices For Feed
     *******************************************************/
    async getAll(req, res, next) {
        try {
            const { page, limit, sortBy, order } = req.query;
            const result = await noticeService.getAllNotices(
                'noticeDivar',
                page,
                limit,
                sortBy,
                order
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeDivars: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 3. Get This Specific Divar Notice From User Feed
     *******************************************************/
    async getOne(req, res, next) {
        try {
            const notice = await noticeService.getNoticeById(
                'noticeDivar',
                req.params.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeDivar: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 4. Edit This Specific Divar Notice
     *******************************************************/
    async edit(req, res, next) {
        try {
            const notice = await noticeService.updateNotice(
                'noticeDivar',
                req.params.id,
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeDivar: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 5. Remove This Specific Divar Notice
     *******************************************************/
    async remove(req, res, next) {
        try {
            await noticeService.deleteNotice(
                'noticeDivar',
                req.params.id,
                req.user.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "NoticeDivar deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 6. Get Bookmarked Divar Notices For This User
     *******************************************************/
    async getBookmarkedNoticesByUserId(req, res, next) {
        try {
            const result = await noticeService.getBookmarkedNotiocesByUserId(
                'noticeDivar',
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

    /********************************************************
     * 7. Bookmark This Specific Divar Notice
     *******************************************************/
    async searchNoticeDivars(req, res, next) {
        try {
            const { q, page, limit } = req.query;
            const result = await noticeService.searchNotices(
                'noticeDivar',
                q,
                page,
                limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeDivars: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 8. Reporting A Divar Notice
     *******************************************************/
    async reportNoticeDivar(req, res, next) {
        try {
            const report = await noticeService.reportNotice(
                'noticeDivar',
                req.params.noticeDivarId,
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

    /********************************************************
     * 9. Bookmark This Specific Divar Notice
     *******************************************************/
    async toggleBookmark(req, res, next) {
        try {
            const bookmark = await noticeService.bookmarkNotice(
                req.params.noticeDivarId,
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

    /********************************************************
     * 10. Share This Specific Divar Notice
     *******************************************************/
    async share(req, res, next) {
        try {
            const share = await noticeService.shareNotice(
                'noticeDivar',
                req.params.noticeDivarId,
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
    AgahiDivarController : new AgahiDivarController()
}