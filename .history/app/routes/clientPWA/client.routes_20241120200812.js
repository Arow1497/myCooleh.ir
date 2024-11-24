const router = require("express").Router();
const { ClientAuthRoutes } = require("./auth");
const { ClientApiRequestsRoutes } = require("./requests");
const { ClientAuthController } = require("../../http/controllers/clientPWA/client.auth.controller");
const { ClientsCommunicationsController } = require("../../http/controllers/clientPWA/clientCommunicationController");
const { ComprehensivePwaAppController } = require("../../http/controllers/clientPWA/comprehensivePwaApp");
const { PwaRegistrationController } = require("../../http/controllers/clientPWA/registration.PWA");

// Client Authentication Routes
router.post("/auth/get-otp", ClientAuthController.clientGetOtp);
router.post("/auth/check-otp", ClientAuthController.clientCheckOtp);
router.post("/auth/refresh-token", ClientAuthController.clientRefreshToken);
router.post("/auth/logout", ClientAuthController.logout);

// Client Communications Routes
router.post("/communications/comment-for-metric", ClientsCommunicationsController.createCommentForMetric);
router.post("/communications/comment-for-product", ClientsCommunicationsController.createCommentForProduct);
router.post("/communications/comment-for-project", ClientsCommunicationsController.createCommentForProject);
router.post("/communications/comment-for-coupon", ClientsCommunicationsController.createCommentForCoupon);

// Comprehensive PWA App Routes
router.get("/comprehensive-pwa", ComprehensivePwaAppController.index); // Assuming an index method exists

// PWA Registration Routes
router.post("/registration/pwa", PwaRegistrationController.registrationPWA);
router.post("/registration/garage-client-acceptance", PwaRegistrationController.garageClientAcceptance);
router.get("/registration/suggestion-supply-part-reqs", PwaRegistrationController.showSuggestionSupplyPartReqsToClient);
router.post("/registration/select-supply-request", PwaRegistrationController.selectThisSupplyRequestByClient);
router.get("/project/:projectID", PwaRegistrationController.findProjectById);

router.use("/auth", ClientAuthRoutes);
router.use("/requests", ClientApiRequestsRoutes);

module.exports = {
    ClientsRoutes: router
}
