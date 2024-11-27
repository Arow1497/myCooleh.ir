const router = require("express").Router();
const { ClientAuthRoutes } = require("./auth");
const { ClientApiRequestsRoutes } = require("./requests");
const { ClientAuthController } = require("../../http/controllers/clientPWA/client.auth.controller");
const { ComprehensivePwaAppController } = require("../../http/controllers/clientPWA/comprehensivePwaApp.controller");

// Client Authentication Routes
router.post("/auth/get-otp", ClientAuthController.requestOtp);
router.post("/auth/check-otp", ClientAuthController.verifyOtp);
router.post("/auth/refresh-token", ClientAuthController.refreshToken);
router.post("/auth/logout", ClientAuthController.logout);

// Comprehensive PWA App Routes
// router.get("/comprehensive-pwa", ComprehensivePwaAppController.index); // Assuming an index method exists

// PWA Registration Routes
// router.post("/registration/pwa", PwaRegistrationController.registrationPWA);
// router.post("/registration/garage-client-acceptance", PwaRegistrationController.garageClientAcceptance);
// router.get("/registration/suggestion-supply-part-reqs", PwaRegistrationController.showSuggestionSupplyPartReqsToClient);
// router.post("/registration/select-supply-request", PwaRegistrationController.selectThisSupplyRequestByClient);
// router.get("/project/:projectID", PwaRegistrationController.findProjectById);

router.use("/auth", ClientAuthRoutes);
router.use("/requests", ClientApiRequestsRoutes);

module.exports = {
    ClientsRoutes: router
}
