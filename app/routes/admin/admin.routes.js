const router = require("express").Router();

const { AdminApiCategoryRouter} = require("./category");
const { AdminApiTransactionRouter } = require("./transactions");

router.use("/category", AdminApiCategoryRouter)
router.use("/transactions", AdminApiTransactionRouter)
module.exports = {
    AdminRoutes: router
}