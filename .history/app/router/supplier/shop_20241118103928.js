const { ShopAgahiTaminPartsController } = require("../../http/controllers/mainApp/shope/taminGhete.controller");
const { SupplierStoreProductController } = require("../../http/controllers/supplierApp/products.controller");
const { uploadImage } = require("../../utils/multer");
const router = require("express").Router();




router.post("/create_product", uploadImage.array("images", 6), SupplierStoreProductController.createProduct)
router.patch("/edit_product/:productID", uploadImage.array("images", 6), SupplierStoreProductController.editProductById)
router.delete("/remove_product/:productID", SupplierStoreProductController.removeProductById)
router.get("/get_products", SupplierStoreProductController.getAllProducts)
router.get("/get_shareLink_ofproduct/:productID", SupplierStoreProductController.shareProduct)

///////////////////////////////////////////////////////////////////////////////
router.post("/create_taminNotice", uploadImage.array("images", 6), ShopAgahiTaminPartsController.createNotice)
router.patch("/edit_taminNotice/:taminNoticeID", uploadImage.array("images", 6), ShopAgahiTaminPartsController.editNoticeById)
router.delete("/remove_taminNotice/:taminNoticeID", ShopAgahiTaminPartsController.removeNoticeById)
router.get("/get_taminNotices", ShopAgahiTaminPartsController.getAllNotices)
router.get("/get_shareLink_oftaminNotice/:taminNoticeID", ShopAgahiTaminPartsController.shareNotice)


module.exports = {
    SupplierApiShopRoutes: router,
  };