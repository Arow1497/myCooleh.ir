const { UserAuthController } = require("../../http/controllers/user/userAuth.controller");

const router = require("express").Router();


router.post("/get-otp", UserAuthController.requestOtp);
router.post("/check-otp", UserAuthController.verifyOtp);
router.post("/refresh-token", UserAuthController.refreshToken);

module.exports = {
    UserApiAuthRoutes : router
}