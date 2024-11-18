const { ForumAgahiEstNiazController } = require("../../../http/controllers/mainApp/forums/agahi.EstNiaz.controller");
const { ForumAgahiDivarController } = require("../../../http/controllers/mainApp/forums/agahiDivar.controller");
const { ForumPostsController } = require("../../../http/controllers/mainApp/forums/posts.controller");
const { stringToArray } = require("../../../utils/functions");
const { uploadImage, upload } = require("../../../utils/multer");
const router = require("express").Router();


router.post("/create_post", upload, stringToArray("tags"), ForumPostsController.createPost)
router.patch("/edit/:postID", upload, stringToArray("tags"), ForumPostsController.editPostById)
router.post("/add_comment/:postID", ForumPostsController.addCommentForPost)
router.get("/get_comments_ofpost/:postID", ForumPostsController.getCommentsOfPost)
router.delete("/remove/:postID", ForumPostsController.removePostById)
router.get("/get_posts", ForumPostsController.getAllPosts)
router.get("/get_shareLink_ofpost/:postID", ForumPostsController.sharePost)

////////////////////////////////////////////////////////////////////////////////////
router.post("/create_dnotice", uploadImage.array("images", 6), ForumAgahiDivarController.createNotice)
router.patch("/edit_dnotice/:dnoticeID", uploadImage.array("images", 6), ForumAgahiDivarController.editNoticeById)
router.delete("/remove_dnotice/:dnoticeID", ForumAgahiDivarController.removeNoticeById)
router.get("/get_dnotices", ForumAgahiDivarController.getAllNotices)
router.get("/get_shareLink_ofdnotice/:dnoticeID", ForumAgahiDivarController.shareNotice)

///////////////////////////////////////////////////////////////////////////////
router.post("/create_enotice", uploadImage.array("images", 6), ForumAgahiEstNiazController.createNotice)
router.patch("/edit_enotice/:enoticeID", uploadImage.array("images", 6), ForumAgahiEstNiazController.editNoticeById)
router.delete("/remove_enotice/:enoticeID", ForumAgahiEstNiazController.removeNoticeById)
router.get("/get_enotices", ForumAgahiEstNiazController.getAllNotices)
router.get("/get_shareLink_ofenotice/:enoticeID", ForumAgahiEstNiazController.shareNotice)


module.exports = {
  UserApiForumRoutes: router,
};



//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiIwOTM5NDAxNDcxNSIsImlhdCI6MTcyNDA2OTcxNiwiZXhwIjoxNzI0MTU2MTE2fQ.4HyzxAS_MCmNovyJSFLJNLarFdiIzGlRq4LB4-Z9K-Q
