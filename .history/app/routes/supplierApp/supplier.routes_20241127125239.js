const router = require("express").Router();
const { VerifyAccessToken, checkSubscription } = require("../../http/middlewares/authorizationSystem.middleware.js");
const { CouponsController } = require("../../http/controllers/supplierApp/coupon.controller.js");
const { ProductController } = require("../../http/controllers/supplierApp/products.controller.js");
const { SupplierStoreRegistrationController } = require("../../http/controllers/supplierApp/registration.controller.js");

// Supplier Shop Routes
// router.use("/shop", SupplierApiShopRoutes);

// Supplier App Routes
// router.use("/supplier_app", VerifyAccessToken, SupplierApiSupplierAppRoutes);

// Supplier Store Coupons Routes
router.post("/coupons", VerifyAccessToken, CouponsController.createCoupon);
router.delete("/coupons/:couponID", VerifyAccessToken, CouponsController.deleteCoupon);
router.put("/coupons/:couponID", VerifyAccessToken, CouponsController.updateCoupon);
router.get("/coupons", VerifyAccessToken, CouponsController.);
router.get("/coupons/list", VerifyAccessToken, CouponsController.getListOfCoupons);
router.get("/coupons/:couponID", VerifyAccessToken, CouponsController.getOneCouponById);
router.get("/coupons/:couponID/comments", VerifyAccessToken, CouponsController.getCommentsOfCoupon);
router.post("/coupons/:couponID/comments", VerifyAccessToken, CouponsController.addCommentsForCoupon);
router.post("/coupons/:couponID/bookmark", VerifyAccessToken, CouponsController.BookmarkCoupon);
router.post("/coupons/:couponID/like", VerifyAccessToken, CouponsController.likeCoupon);
router.post("/coupons/:couponID/dislike", VerifyAccessToken, CouponsController.dislikeCoupon);
router.post("/coupons/:couponID/share", VerifyAccessToken, CouponsController.shareCoupon);
router.post("/coupons/:couponID/add-to-cooleh", VerifyAccessToken, CouponsController.addCouponByIdToCooleh);
router.post("/coupons/:couponID/pele", VerifyAccessToken, CouponsController.peleCouponById);
router.post("/coupons/:couponID/success-sell", VerifyAccessToken, CouponsController.successSellCouponById);
router.get("/coupons/:couponID/find", VerifyAccessToken, CouponsController.findCouponById);

// Product Routes
router.post("/products", VerifyAccessToken, ProductController.createProduct);
router.put("/products/:productID", VerifyAccessToken, ProductController.updateProduct);
router.delete("/products/:productID", VerifyAccessToken, ProductController.deleteProduct);
router.get("/products/:productID", VerifyAccessToken, ProductController.getProduct);
router.get("/products", VerifyAccessToken, ProductController.getProducts);
router.post("/products/:productID/bookmark", VerifyAccessToken, ProductController.toggleBookmark);
router.get("/products/bookmarked", VerifyAccessToken, ProductController.getBookmarkedProducts);
router.post("/products/:productID/basket", VerifyAccessToken, ProductController.addToBasket);
router.delete("/products/:productID/basket", VerifyAccessToken, ProductController.removeFromBasket);
router.get("/products/basket", VerifyAccessToken, ProductController.getBasket);
router.put("/products/:productID/basket/quantity", VerifyAccessToken, ProductController.updateBasketItemQuantity);
router.post("/products/basket/validate", VerifyAccessToken, ProductController.validateBasket);
router.post("/products/:productID/wishlist", VerifyAccessToken, ProductController.moveToWishlist);
router.post("/products/bulk-action", VerifyAccessToken, ProductController.applyBulkAction);
router.get("/products/basket-summary", VerifyAccessToken, ProductController.getBasketSummary);
router.post("/products/basket/clear", VerifyAccessToken, ProductController.clearBasket);
router.get("/products/search/text", VerifyAccessToken, ProductController.searchByText);
router.get("/products/search/category", VerifyAccessToken, ProductController.searchByCategory);
router.get("/products/search/tags", VerifyAccessToken, ProductController.searchByTags);
router.get("/products/search", VerifyAccessToken, ProductController.searchProducts);
router.get("/products/trending", VerifyAccessToken, ProductController.getTrendingProducts);
router.get("/products/best-selling", VerifyAccessToken, ProductController.getBestSellingProducts);
router.get("/products/similar/:productID", VerifyAccessToken, ProductController.getSimilarProducts);
router.get("/products/user/:userID", VerifyAccessToken, ProductController.getProductsByUserId);
router.get("/products/user/:userID/liked", VerifyAccessToken, ProductController.getLikedProductsByUserId);
router.get("/products/user/:userID/bookmarked", VerifyAccessToken, ProductController.getBookmarkedProductsByUserId);
router.put("/products/:productID/publish", VerifyAccessToken, ProductController.togglePublishStatus);
router.get("/products/:productID/stats", VerifyAccessToken, ProductController.getProductStats);
router.put("/products/bulk-update", VerifyAccessToken, ProductController.bulkUpdateProducts);
router.get("/products/provider", VerifyAccessToken, ProductController.getProviderProducts);
router.post("/products/:productID/share", VerifyAccessToken, ProductController.shareProduct);

// Supplier Store Registration Routes
router.post("/registration", VerifyAccessToken, SupplierStoreRegistrationController.supplierRegistration);
router.put("/registration/:storeID", VerifyAccessToken, SupplierStoreRegistrationController.updateSupplierStoreById);
router.delete("/registration/:storeID", VerifyAccessToken, SupplierStoreRegistrationController.deleteSupplierStoreById);
router.post("/registration/garage-referal", VerifyAccessToken, SupplierStoreRegistrationController.invitedWithGarageReferal);

module.exports = {
    SupplierRoutes: router
}
