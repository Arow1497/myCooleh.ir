const { ClientAuthController } = require("../../http/controllers/clientPWA/client.auth.controller");
const router = require("express").Router();


router.post("/get-otp", ClientAuthController.clientGetOtp);
router.post("/check-otp", ClientAuthController.clientCheckOtp);
router.post("/refresh-token", ClientAuthController.clientRefreshToken);



module.exports = {
    ClientAuthRoutes : router
}