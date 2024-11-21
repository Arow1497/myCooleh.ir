const { AdminRoutes } = require("./admin/admin.routes");
const { HomeRoutes } = require("./api");
const { ClientsRoutes } = require("./client/client.routes");
const { MainAppRoutes } = require("./mainApp/mainapp.routes");
const SupplierRoutes  = require("./supplier/supplier.routes");
const  {UserRoutes}  = require("./user/user.routes");

const router = require("express").Router();

router.use("/user", UserRoutes);
router.use("/client", ClientsRoutes);
router.use("/admin", AdminRoutes);
router.use("/supplier", SupplierRoutes);
router.use("/main_app", MainAppRoutes);
router.use("/", HomeRoutes);

module.exports = {
    AllRoutes: router
}
