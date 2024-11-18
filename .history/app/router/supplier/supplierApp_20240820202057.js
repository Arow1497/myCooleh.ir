const { SupplierStoreCouponsController } = require("../../http/controllers/SupplierApp/coupon.controller");
const { stringToArray } = require("../../utils/functions");
const { uploadImage } = require("../../utils/multer");

const router = require("express").Router();

router.post("/create_coupon",uploadImage.array("images", 6), SupplierStoreCouponsController.createCoupon)
router.patch("/edit/:couponID", uploadImage.array("images", 6), SupplierStoreCouponsController.editCouponById)
router.post("/add_comment/:couponID", SupplierStoreCouponsController.addCommentsForCoupon)
router.get("/get_comments_ofcoupon/:couponID", SupplierStoreCouponsController.getCommentsOfCoupon)
router.delete("/remove/:couponID", SupplierStoreCouponsController.removeCouponById)
router.get("/get_coupons", SupplierStoreCouponsController.getAllCoupons)
router.get("/get_shareLink_ofcoupon/:couponID", SupplierStoreCouponsController.shareCoupon)

module.exports = {
    SupplierApiSupplierAppRoutes: router,
  };