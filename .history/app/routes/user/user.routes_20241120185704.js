const router = require("express").Router();
const { UserAuthController } = require("../controllers/user/userAuth.controller");

// User Authentication Routes
router.post("/auth/request-otp", UserAuthController.requestOtp);
router.post("/auth/verify-otp", UserAuthController.verifyOtp);
router.post("/auth/refresh-token", UserAuthController.refreshToken);
router.post("/auth/logout", UserAuthController.logout);
router.post("/auth/complete-profile", UserAuthController.completeProfile);
router.post("/auth/update-mobile", UserAuthController.updateMobile);
router.post("/auth/deactivate-account", UserAuthController.deactivateAccount);
router.post("/auth/reactivate-account", UserAuthController.reactivateAccount);
router.post("/auth/update-business-profile", UserAuthController.updateBusinessProfile);
router.post("/auth/update-social-profile", UserAuthController.updateSocialProfile);
router.post("/auth/update-location-info", UserAuthController.updateLocationInfo);
router.post("/auth/update-financial-info", UserAuthController.updateFinancialInfo);
router.post("/auth/update-user-status", UserAuthController.updateUserStatus);
router.post("/auth/update-profile-media", UserAuthController.updateProfileMedia);
router.post("/auth/update-user-roles", UserAuthController.updateUserRoles);
router.post("/auth/reset-password", UserAuthController.resetPassword);
router.post("/auth/request-account-deletion", UserAuthController.requestAccountDeletion);

module.exports = {
    UserRoutes: router
}
