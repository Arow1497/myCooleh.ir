const { AgahiEstNiazController } = require("../../../http/controllers/mainApp/forums/agahi.EstNiaz.controller");
const { AgahiDivarController } = require("../../../http/controllers/mainApp/forums/agahiDivar.controller");
const { PostController } = require("../../../http/controllers/mainApp/forums/posts.controller");
const { stringToArray } = require("../../../utils/functions");
const { uploadImage, upload } = require("../../../utils/multer");
const router = require("express").Router();


router.post("/create_post", upload, stringToArray("tags"), PostController.createPost)
router.patch("/edit/:postID", upload, stringToArray("tags"), PostController.editPostById)
router.post("/add_comment/:postID", PostController.createComment)
router.get("/get_comments_ofpost/:postID", PostController.getPostComments)
router.delete("/remove/:postID", PostController.removePostById)
router.get("/get_posts", PostController.getAllPosts)
router.get("/get_shareLink_ofpost/:postID", PostController.sharePost)

////////////////////////////////////////////////////////////////////////////////////
router.post("/create_dnotice", uploadImage.array("images", 6), AgahiDivarController.createNoticeDivar)
router.patch("/edit_dnotice/:dnoticeID", uploadImage.array("images", 6), AgahiDivarController.editNoticeDivarById)
router.delete("/remove_dnotice/:dnoticeID", AgahiDivarController.removeNoticeDivarById)
router.get("/get_dnotices", AgahiDivarController.getAllNoticeDivars)
router.get("/get_shareLink_ofdnotice/:dnoticeID", AgahiDivarController.shareNoticeDivar)

///////////////////////////////////////////////////////////////////////////////
router.post("/create_enotice", uploadImage.array("images", 6), AgahiEstNiazController.createNoticeEstNiaz)
router.patch("/edit_enotice/:enoticeID", uploadImage.array("images", 6), AgahiEstNiazController.editNoticeEstNiazById)
router.delete("/remove_enotice/:enoticeID", AgahiEstNiazController.removeNoticeEstNiazById)
router.get("/get_enotices", AgahiEstNiazController.getAllNoticeEstNiazs)
router.get("/get_shareLink_ofenotice/:enoticeID", AgahiEstNiazController.shareNoticeEstNiaz)


module.exports = {
  UserApiForumRoutes: router,
};



//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiIwOTM5NDAxNDcxNSIsImlhdCI6MTcyNDA2OTcxNiwiZXhwIjoxNzI0MTU2MTE2fQ.4HyzxAS_MCmNovyJSFLJNLarFdiIzGlRq4LB4-Z9K-Q
