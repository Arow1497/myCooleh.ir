const createHttpError = require("http-errors");
const { getOtpSchema, checkOtpSchema } = require("../../validators/user/auth.schema.js");
const Controller = require("../controller.js");
const {ClientAuthService} = require("../../services/clientPWA/clientAuth.service.js");

class ClientAuthController extends Controller {
    constructor() {
        super();
        this.authService = new ClientAuthService();
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
            await checkOtpSchema.validateAsync(req.body);
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
            const result = await this.authService.refreshClientToken(refreshToken);
            
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
            await this.authService.logoutClient(refreshToken);
            
            return res.status(200).json({
                message: "خروج با موفقیت انجام شد"
            });
        } catch (error) {
            next(error);
        }
    }
    
    async completeProfile(req, res, next) {
        try {
            const result = await this.authService.completeClientProfile(req.client.id, req.body);
            return res.status(201).json({
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async updateMobile(req, res, next) {
        try {
            const result = await this.authService.updateClientMobile(req.client.id, req.body.newMobile, req.body.code);
            return res.json({
                data: {
                    message: "شماره موبایل با موفقیت تغییر کرد",
                    client: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deactivateAccount(req, res, next) {
        try {
            await this.authService.deactivateClientAccount(req.client.id);
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
            const result = await this.authService.reactivateClientAccount(mobile, code);
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

    async updateLocationInfo(req, res, next) {
        try {
            const result = await this.authService.updateLocationInfo(req.client.id, req.body);
            return res.json({
                data: {
                    message: "اطلاعات مکانی با موفقیت بروزرسانی شد",
                    clientProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateClientStatus(req, res, next) {
        try {
            const result = await this.authService.updateClientStatus(
                req.client.id,
                req.body.clientId,
                req.body.status,
                req.body.reason
            );
            return res.json({
                message: "وضعیت کاربر با موفقیت تغییر کرد",
                client: result
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProfileMedia(req, res, next) {
        try {
            const result = await this.authService.updateProfileMedia(req.client.id, req.body);
            return res.json({
                data: {
                    message: "تصاویر پروفایل با موفقیت بروزرسانی شد",
                    clientProfile: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateClientRoles(req, res, next) {
        try {
            const result = await this.authService.updateClientRoles(
                req.client.id,
                req.body.clientId,
                req.body.roles
            );
            return res.json({
                message: "نقش‌های کاربری با موفقیت بروزرسانی شد",
                clientRoles: result
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { mobile, code, newPassword } = req.body;
            await this.authService.resetClientPassword(mobile, code, newPassword);
            return res.json({
                message: "رمز عبور با موفقیت بازیابی شد"
            });
        } catch (error) {
            next(error);
        }
    }

    async requestAccountDeletion(req, res, next) {
        try {
            await this.authService.requestAccountDeletion(req.client.id, req.body.reason);
            return res.json({
                message: "درخواست حذف حساب کاربری با موفقیت ثبت شد"
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    ClientAuthController: new ClientAuthController()
};