const router = require("express").Router();
const { UserAuthController } = require("../../http/controllers/user/userAuth.controller");
const { UserProfileController } = require("../../http/controllers/user/userProfile");
const { MechanicRegistrationController } = require("../../http/controllers/user/freelancer.Mechanic.controller");
const { UsersCommunicationsController } = require("../../http/controllers/user/communications.controller");

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

// User Profile Routes
router.get("/profile", UserProfileController.userProfile);
router.get("/profile/resume", UserProfileController.showUserResume);
router.get("/profile/bookmarks", UserProfileController.showUserBookmarks);
router.get("/profile/posts", UserProfileController.showUserPosts);
router.get("/profile/comments", UserProfileController.ShowUserComments);
router.get("/profile/dastyar-coworks", UserProfileController.ShowUserDastyarCoWorks);
router.get("/profile/garage", UserProfileController.ShowUsersGarageProfile);
router.get("/profile/garage/comments", UserProfileController.ShowGarageComments);
router.get("/profile/garage/projects", UserProfileController.ShowGarageProjects);
router.get("/profile/garage/dastyar-reqs", UserProfileController.ShowGarageDastyarReqs);
router.get("/profile/garage/outsourcing-reqs", UserProfileController.ShowGarageOutsourcingReqs);
router.get("/profile/supplier-store", UserProfileController.ShowUsersSupplierStoreProfile);

// Mechanic Registration Routes
router.post("/mechanic/registration", MechanicRegistrationController.mechanicRegistration);
router.post("/shagerd/registration", MechanicRegistrationController.shagerdRegistration);
router.post("/dastyar-reqs/send-coworking-request-by-mechanic", MechanicRegistrationController.dastyarReqsSendCoWorkingRequestByMechanic);
router.post("/apprentice-reqs/send-coworking-request-by-shagerd", MechanicRegistrationController.apprenticeReqsSendCoWorkingRequestByShagerd);
router.get("/mechanic/monthly-projects-income-revenue", MechanicRegistrationController.mechanicMonthlyProjectsIncomeRevenue);
router.get("/mechanic/monthly-services-income-revenue", MechanicRegistrationController.mechanicMonthlyServicesIncomeRevenue);
router.get("/dastyar-req/:dastyarreqID", MechanicRegistrationController.findDastyarReqById);
router.get("/apprentice-req/:apprenticereqID", MechanicRegistrationController.findApprenticeReqById);

// Users Communications Routes
router.post("/communications/comment-for-metric", UsersCommunicationsController.createCommentForMetric);
router.post("/communications/review-for-metric", UsersCommunicationsController.createReviewForMetric);
router.post("/communications/comment-for-product", UsersCommunicationsController.createCommentForProduct);
router.post("/communications/comment-for-project", UsersCommunicationsController.createCommentForProject);
router.post("/communications/comment-for-coupon", UsersCommunicationsController.createCommentForCoupon);
router.post("/communications/comment-for-dastyar-req", UsersCommunicationsController.createCommentForDastyarReq);
router.post("/communications/comment-for-outsourcing-req", UsersCommunicationsController.createCommentForOutsourcingReq);

module.exports = {
    UserRoutes: router
}
