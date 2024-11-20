const router = require("express").Router();
const { VerifyAccessToken, checkSubscription } = require("../../http/middlewares/authorizationSystem.js.js");
const { UserApiForumRoutes } = require("../mainApp/forum/forum.js");
const { UserApiGarageRoutes } = require("../mainApp/myGarage/garage.js");

router.use("/garage", VerifyAccessToken, UserApiGarageRoutes);
router.use("/forum", VerifyAccessToken, checkSubscription, UserApiForumRoutes);

module.exports = {
    MainAppRoutes: router
}
