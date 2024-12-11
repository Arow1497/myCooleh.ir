const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const noticeService = require("../../../services/mainApp/forums/notice.service");

class AgahiEstNiazController extends Controller {
    
    /********************************************************
     * 1. Creating New EstNiaz Notice
     *******************************************************/
    async create(req, res, next) {
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

    /********************************************************
     * 2. Get List Of All EstNiaz Notices For Feed
     *******************************************************/
    async getAll(req, res, next) {
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

    /********************************************************
     * 3. Get This Specific EstNiaz Notice From User Feed
     *******************************************************/
    async getOne(req, res, next) {
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

    /********************************************************
     * 4. Edit This Specific EstNiaz Notice
     *******************************************************/
    async edit(req, res, next) {
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

    /********************************************************
     * 5. Remove This Specific EstNiaz Notice
     *******************************************************/
    async remove(req, res, next) {
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

    /********************************************************
     * 6. Get Bookmarked EstNiaz Notices For This User
     *******************************************************/
    async getBookmarked(req, res, next) {
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

    /********************************************************
     * 7. Search A Specific EstNiaz Notice From Feed
     *******************************************************/
    async search(req, res, next) {
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

    /********************************************************
     * 8. Reporting A EstNiaz Notice
     *******************************************************/
    async report(req, res, next) {
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

     /********************************************************
     * 9. Bookmark This Specific EstNiaz Notice
     *******************************************************/
    async toggleBookmark(req, res, next) {
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

    /********************************************************
     * 10. Share This Specific EstNiaz Notice
     *******************************************************/
    async share(req, res, next) {
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