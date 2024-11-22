const { PwaRegistrationController } = require("../../http/controllers/clientPWA/registration.PWA.js");
const { VerifyAccessToken } = require("../../http/middlewares/authorizationSystem.js.js");

const router = require("express").Router();


router.post("/acceptance", VerifyAccessToken, PwaRegistrationController.garageClientAcceptance);


module.exports = {
    ClientApiRequestsRoutes : router
}