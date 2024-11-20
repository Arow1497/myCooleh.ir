const router = require("express").Router();
const { VerifyAccessToken } = require("../../http/middlewares/authorizationSystem.js.js");
const { UserApiForumRoutes } = require("../mainApp/forum/forum.js");
const { UserApiGarageRoutes } = require("../mainApp/myGarage/garage.js");

router.use("/garage", VerifyAccessToken, UserApiGarageRoutes);
router.use("/forum", VerifyAccessToken, UserApiForumRoutes);

module.exports = {
    MainAppRoutes: router
}
