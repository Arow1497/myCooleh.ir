const router = require("express").Router();

const { ClientAuthRoutes} = require("./auth");
const { ClientApiRequestsRoutes } = require("./requests");

router.use("/auth", ClientAuthRoutes)
router.use("/requests", ClientApiRequestsRoutes)
ClientApiRequestsRoutes

module.exports = {
    ClientsRoutes: router
}