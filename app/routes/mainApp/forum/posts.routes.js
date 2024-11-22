const express = require('express');
const router = express.Router();
const { PostController } = require('../../../http/controllers/mainApp/forums/posts.controller');

// Post CRUD Operations
router.post('/create', PostController.createPost);
router.get('/', PostController.getAllPosts);
router.get('/:id', PostController.getOnePostById);
router.put('/:id', PostController.editPostById);
router.delete('/:id', PostController.removePostById);

// Post Retrieval Operations
router.get('/user/:userId', PostController.getPostsByUserId);
router.get('/trending', PostController.getTrendingPosts);
router.get('/search', PostController.searchPosts);

// Post Interaction Operations
router.post('/:postId/like', PostController.likePost);
router.post('/:postId/dislike', PostController.dislikePost);
router.post('/:postId/bookmark', PostController.bookmarkPost);
router.post('/:postId/share', PostController.sharePost);
router.post('/:postId/report', PostController.reportPost);

// Comment Operations
router.post('/:postId/comments', PostController.createComment);
router.get('/:postId/comments', PostController.getPostComments);
router.get('/comments/:commentId/replies', PostController.getCommentReplies);
router.put('/comments/:commentId', PostController.updateComment);
router.delete('/comments/:commentId', PostController.deleteComment);
router.post('/comments/:commentId/vote', PostController.voteComment);
router.post('/comments/:commentId/report', PostController.reportComment);

// User-specific Post Operations
router.get('/user/:userId/liked', PostController.getLikedPostsByUserId);
router.get('/user/:userId/bookmarked', PostController.getBookmarkedPostsByUserId);
router.get('/tag/:tagId', PostController.getPostsByTag);
router.put('/:id/field', PostController.updatePostField);
router.get('/category/:categoryId', PostController.getPostsByCategory);
router.post('/:postId/repost', PostController.repost);

module.exports = router;
