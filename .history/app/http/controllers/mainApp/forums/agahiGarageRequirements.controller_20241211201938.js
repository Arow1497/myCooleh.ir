const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const noticeService = require("../../../services/mainApp/forums/notice.service");

class AgahiGarageRequirementsController extends Controller {
    /********************************************************
     * 1. Creating New GarageRequirement Notice
     *******************************************************/
    async create(req, res, next) {
    try {
        const notice = await noticeService.createNotice(
            'noticeGarageRequirement',
            req.body,
            req.user.id,
            req.files,
            req.body.fileUploadPath
        );

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: { noticeGarageRequirement: notice }
        });
    } catch (error) {
        next(error);
    }
    }

    /********************************************************
     * 2. Get List Of All GarageRequirement Notices For Feed
     *******************************************************/
    async getAll(req, res, next) {
        try {
            const { page, limit, sortBy, order } = req.query;
            const result = await noticeService.getAllNotices(
                'noticeGarageRequirement',
                page,
                limit,
                sortBy,
                order
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeGarageRequirements: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 3. Get This Specific GarageRequirement Notice From User Feed
     *******************************************************/
    async getOne(req, res, next) {
        try {
            const notice = await noticeService.getNoticeById(
                'noticeGarageRequirement',
                req.params.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeGarageRequirement: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 4. Edit This Specific GarageRequirement Notice
     *******************************************************/
    async edit(req, res, next) {
        try {
            const notice = await noticeService.updateNotice(
                'noticeGarageRequirement',
                req.params.id,
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { noticeGarageRequirement: notice }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 5. Remove This Specific GarageRequirement Notice
     *******************************************************/
    async remove(req, res, next) {
        try {
            await noticeService.deleteNotice(
                'noticeGarageRequirement',
                req.params.id,
                req.user.id
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "NoticeGarageRequirement deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 6. Get Bookmarked GarageRequirement Notices For This User
     *******************************************************/
    async getBookmarked(req, res, next) {
        try {
            const result = await noticeService.getBookmarkedNotiocesByUserId(
                'noticeGarageRequirement',
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
     * 7. Search A Specific GarageRequirement Notice From Feed
     *******************************************************/
    async search(req, res, next) {
        try {
            const { q, page, limit } = req.query;
            const result = await noticeService.searchNotices(
                'noticeGarageRequirement',
                q,
                page,
                limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    noticeGarageRequirements: result.notices,
                    pagination: result.pagination
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 8. Reporting A GarageRequirement Notice
     *******************************************************/
    async report(req, res, next) {
        try {
            const report = await noticeService.reportNotice(
                'noticeGarageRequirement',
                req.params.noticeGarageRequirementId,
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
     * 9. Bookmark This Specific GarageRequirement Notice
     *******************************************************/
    async toggleBookmark(req, res, next) {
        try {
            const bookmark = await noticeService.bookmarkNotice(
                req.params.noticeGarageRequirementId,
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
     * 10. Share This Specific GarageRequirement Notice
     *******************************************************/
    async share(req, res, next) {
        try {
            const share = await noticeService.shareNotice(
                'noticeGarageRequirement',
                req.params.noticeGarageRequirementId,
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
    AgahiGarageRequirementsController : new AgahiGarageRequirementsController()}