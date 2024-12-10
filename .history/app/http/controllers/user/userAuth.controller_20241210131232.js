const createHttpError = require("http-errors");
const { getOtpSchema, checkOtpSchema } = require("../../validators/user/auth.schema.js");
const Controller = require("../controller.js");
const {UserAuthService} = require("../../services/user/userAuth.service.js");
class UserAuthController extends Controller {
    constructor() {
        super();
        this.authService = new UserAuthService();
    }

    async requestOtp(req, res, next) {
        try {
            await getOtpSchema.validateAsync(req.body);
            const { mobile } = req.body;
            const result = await this.authService.requestOtp(mobile, req.ip);
            
            return res.status(200).send({
                data: {
                    statusCode: 200,
                    message: "کد اعتبار سنجی با موفقیت ارسال شد",
                    ...result
                }
            });
        } catch (error) {
            next(createHttpError.BadRequest(error.message));
        }
    }

    async verifyOtp(req, res, next) {
        try {
            // await checkOtpSchema.validateAsync(req.body);
            const { mobile, code } = req.body;
            const result = await this.authService.verifyOtp(mobile, code, req.ip);
            
            return res.json({
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refreshUserToken(refreshToken);
            
            return res.json({
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await this.authService.logoutUser(refreshToken);
            
            return res.status(200).json({
                message: "خروج با موفقیت انجام شد"
            });
        } catch (error) {
            next(error);
        }
    }

    async updateMobile(req, res, next) {
        try {
            const result = await this.authService.updateUserMobile(req.user.id, req.body.newMobile, req.body.code);
            return res.json({
                data: {
                    message: "شماره موبایل با موفقیت تغییر کرد",
                    user: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deactivateAccount(req, res, next) {
        try {
            await this.authService.deactivateUserAccount(req.user.id);
            return res.json({
                message: "حساب کاربری با موفقیت غیرفعال شد"
            });
        } catch (error) {
            next(error);
        }
    }

    async reactivateAccount(req, res, next) {
        try {
            const { mobile, code } = req.body;
            const result = await this.authService.reactivateUserAccount(mobile, code);
            return res.json({
                data: {
                    message: "حساب کاربری با موفقیت فعال شد",
                    ...result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateBusinessProfile(req, res, next) {
        try {
            const result = await this.authService.updateBusinessProfileInfo(req.user.id, req.body);
            return res.json({
                data: {
                    message: "پروفایل تجاری با موفقیت بروزرسانی شد",
                    businessProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateSocialProfile(req, res, next) {
        try {
            const result = await this.authService.updateSocialProfileInfo(req.user.id, req.body.socialLinks);
            return res.json({
                data: {
                    message: "پروفایل اجتماعی با موفقیت بروزرسانی شد",
                    socialProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateLocationInfo(req, res, next) {
        try {
            const result = await this.authService.updateLocationInfo(req.user.id, req.body);
            return res.json({
                data: {
                    message: "اطلاعات مکانی با موفقیت بروزرسانی شد",
                    userProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateFinancialInfo(req, res, next) {
        try {
            const result = await this.authService.updateFinancialInfo(req.user.id, req.body);
            return res.json({
                data: {
                    message: "اطلاعات مالی و هویتی با موفقیت بروزرسانی شد",
                    userProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateUserStatus(req, res, next) {
        try {
            const result = await this.authService.updateUserStatus(
                req.user.id,
                req.body.userId,
                req.body.status,
                req.body.reason
            );
            return res.json({
                message: "وضعیت کاربر با موفقیت تغییر کرد",
                user: result
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProfileMedia(req, res, next) {
        try {
            const result = await this.authService.updateProfileMedia(req.user.id, req.body);
            return res.json({
                data: {
                    message: "تصاویر پروفایل با موفقیت بروزرسانی شد",
                    userProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateUserRoles(req, res, next) {
        try {
            const result = await this.authService.updateUserRoles(
                req.user.id,
                req.body.userId,
                req.body.roles
            );
            return res.json({
                message: "نقش‌های کاربری با موفقیت بروزرسانی شد",
                userRoles: result
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { mobile, code, newPassword } = req.body;
            await this.authService.resetUserPassword(mobile, code, newPassword);
            return res.json({
                message: "رمز عبور با موفقیت بازیابی شد"
            });
        } catch (error) {
            next(error);
        }
    }

    async requestAccountDeletion(req, res, next) {
        try {
            await this.authService.requestAccountDeletion(req.user.id, req.body.reason);
            return res.json({
                message: "درخواست حذف حساب کاربری با موفقیت ثبت شد"
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    UserAuthController: new UserAuthController()
};