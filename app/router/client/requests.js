const { PwaRegistrationController } = require("../../http/controllers/clientPWA/registration.PWA");
const { VerifyAccessToken } = require("../../http/middlewares/authorizationSystem.js");

const router = require("express").Router();


router.post("/acceptance", VerifyAccessToken, PwaRegistrationController.garageClientAcceptance);


module.exports = {
    ClientApiRequestsRoutes : router
}