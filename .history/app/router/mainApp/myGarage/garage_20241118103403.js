const { GarageMetricsController } = require("../../../http/controllers/mainApp/myGarage/metric.controller");
const { GarageRegistrationController } = require("../../../http/controllers/MainApp/MyGarage/registration.controller");
const { stringToArray } = require("../../../utils/functions");
const { uploadImage } = require("../../../utils/multer");
const router = require("express").Router();


router.post("/registration",uploadImage.array("images", 3), GarageRegistrationController.registrationGarage)

///////////////////////////////////////////////////////////////////////////////////////
router.post("/create_metric", uploadImage.array("images", 6), stringToArray("tags"), GarageMetricsController.createMetric)
router.patch("/edit/:metricID", uploadImage.array("images", 6), stringToArray("tags"), GarageMetricsController.editMetricById)
router.post("/add_comment/:metricID", GarageMetricsController.addCommentsForMetric)
router.get("/get_comments_ofmetric/:metricID", GarageMetricsController.getCommentsOfMetric)
router.delete("/remove/:metricID", GarageMetricsController.removeMetricById)
router.get("/get_metrics", GarageMetricsController.getAllMetrics)
router.get("/get_shareLink_ofmetric/:metricID", GarageMetricsController.shareMetric)


module.exports = {
    UserApiGarageRoutes : router
}