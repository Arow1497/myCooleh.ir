const router = require("express").Router();

const { UserApiAuthRoutes} = require("./auth.js");


router.use("/auth", UserApiAuthRoutes)

module.exports = {
    UserRoutes: router
}