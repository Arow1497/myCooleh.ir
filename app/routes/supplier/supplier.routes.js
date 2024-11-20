const router = require("express").Router();

const { VerifyAccessToken, checkSubscription } = require("../../http/middlewares/authorizationSystem.js");
const { SupplierApiShopRoutes } = require("./shop.js");
const { SupplierApiSupplierAppRoutes } = require("./supplierApp.js");


router.use("/shop", SupplierApiShopRoutes)
router.use("/supplier_app",VerifyAccessToken, SupplierApiSupplierAppRoutes)

module.exports = {
    SupplierRoutes: router
}

