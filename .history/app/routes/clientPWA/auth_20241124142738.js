const { ClientAuthController } = require("../../http/controllers/clientPWA/client.auth.controller");
const router = require("express").Router();


router.post("/get-otp", ClientAuthController.requestOtp);
router.post("/check-otp", ClientAuthController.verifyOtp);
router.post("/refresh-token", ClientAuthController.refreshToken);



module.exports = {
    ClientAuthRoutes : router
}