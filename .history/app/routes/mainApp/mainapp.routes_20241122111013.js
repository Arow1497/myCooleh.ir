const router = require("express").Router();
const { VerifyAccessToken } = require("../../http/middlewares/authorizationSystem.js.js");
const { UserApiForumRoutes } = require("../mainApp/forum/forum.js");
const { UserApiGarageRoutes } = require("../mainApp/myGarage/garage.js");
const { UserApiDastyarRoutes } = require("../mainApp/dastyar/dastyar.routes.js");
const { UserApiApprenticeshipRoutes } = require("../mainApp/dastyar/apprenticeship.routes.js");
const { UserApiOutsourcingRoutes } = require("../mainApp/dastyar/outsourcing.routes.js");

router.use("/garage", VerifyAccessToken, UserApiGarageRoutes);
router.use("/forum", VerifyAccessToken, UserApiForumRoutes);
router.use("/dastyar", VerifyAccessToken, UserApiDastyarRoutes);
router.use("/apprenticeship", VerifyAccessToken, UserApiApprenticeshipRoutes);
router.use("/outsourcing", VerifyAccessToken, UserApiOutsourcingRoutes);

module.exports = {
    MainAppRoutes: router
}
