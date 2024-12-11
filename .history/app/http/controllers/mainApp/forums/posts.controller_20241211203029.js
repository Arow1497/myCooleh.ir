const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const PostService = require("../../../services/mainApp/forums/postsServices/posts.service");
const InteractionService = require("../../../services/mainApp/forums/postsServices/interaction.service");
const CommentService = require("../../../services/mainApp/forums/postsServices/comment.service");

class PostController extends Controller {

    /********************************************************
     * 1. Creating New Post 
     *******************************************************/
  async createPost(req, res, next) {
        try {
            const post = await PostService.createPost(
                req.body,
                req.user.id,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { post }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 2. Get All Post For Feed
     *******************************************************/
  async getAllPosts(req, res, next) {
        try {
            const { page, limit, sortBy, order } = req.query;
            const result = await PostService.getAllPosts(page, limit, sortBy, order);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 3. Get This Specific Post
     *******************************************************/
  async getOnePostById(req, res, next) {
        try {
            const post = await PostService.getPostById(req.params.id);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { post }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 4. Edit This Specific Post
     *******************************************************/
  async editPostById(req, res, next) {
        try {
            const post = await PostService.updatePost(
                req.params.id,
                req.user.id,
                req.body,
                req.files,
                req.body.fileUploadPath
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { post }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 5. Remove This Specific Post
     *******************************************************/
  async removePostById(req, res, next) {
        try {
            await PostService.deletePost(req.params.id, req.user.id);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Post deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Post Retrieval Operations
    /********************************************************
     * 6. Get All Of User Posts
     *******************************************************/
  async getPostsByUserId(req, res, next) {
        try {
            const result = await PostService.getPostsByUserId(
                req.params.userId,
                req.query.page,
                req.query.limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 7. Get All Of Platfor Trending Posts
     *******************************************************/
  async getTrendingPosts(req, res, next) {
        try {
            const { timeframe, page, limit } = req.query;
            const result = await PostService.getTrendingPosts(timeframe, page, limit);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 8. Creating New Post
     *******************************************************/
  async searchPosts(req, res, next) {
        try {
            const { q, category, tag, page, limit } = req.query;
            const result = await PostService.searchPosts(q, category, tag, page, limit);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    // Post Interaction Operations
    /********************************************************
     * 9. Like This Specific Post
     *******************************************************/
  async likePost(req, res, next) {
        try {
            const like = await InteractionService.likePost(req.params.postId, req.user.id);

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { like }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 10. Dislike This Specific Post
     *******************************************************/
  async dislikePost(req, res, next) {
        try {
            const dislike = await InteractionService.dislikePost(req.params.postId, req.user.id);

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { dislike }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 11. Bookmark This Specific Post
     *******************************************************/
  async bookmarkPost(req, res, next) {
        try {
            const bookmark = await InteractionService.bookmarkPost(req.params.postId, req.user.id);

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { bookmark }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 12. Share This Specific Post
     *******************************************************/
  async sharePost(req, res, next) {
        try {
            const { platform, customMessage } = req.body;
            const share = await InteractionService.sharePost(
                req.params.postId,
                req.user.id,
                platform,
                customMessage
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { share }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 13. Report This Specific Post
     *******************************************************/
  async reportPost(req, res, next) {
        try {
            const { reason, description } = req.body;
            const report = await InteractionService.reportPost(
                req.params.postId,
                req.user.id,
                reason,
                description
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { report }
            });
        } catch (error) {
            next(error);
        }
    }

    // Comment Operations
    /********************************************************
     * 14. Creating New Comment For This Post
     *******************************************************/
  async createComment(req, res, next) {
        try {
            const { content, parentId } = req.body;
            const comment = await CommentService.createComment(
                req.params.postId,
                req.user.id,
                content,
                parentId
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { comment }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 15. Get All Comments Of This Post
     *******************************************************/
  async getPostComments(req, res, next) {
        try {
            const result = await CommentService.getPostComments(
                req.params.postId,
                req.query.page,
                req.query.limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 16. Creating New Post
     *******************************************************/
  async getCommentReplies(req, res, next) {
        try {
            const result = await CommentService.getCommentReplies(
                req.params.commentId,
                req.query.page,
                req.query.limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 17. Creating New Post
     *******************************************************/
  async updateComment(req, res, next) {
        try {
            const comment = await CommentService.updateComment(
                req.params.commentId,
                req.user.id,
                req.body.content
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { comment }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 18. Creating New Post
     *******************************************************/
  async deleteComment(req, res, next) {
        try {
            await CommentService.deleteComment(req.params.commentId, req.user.id);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Comment deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 19. Creating New Post
     *******************************************************/
  async voteComment(req, res, next) {
        try {
            const vote = await CommentService.voteComment(
                req.params.commentId,
                req.user.id,
                req.body.voteType
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { vote }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 20. Creating New Post
     *******************************************************/
  async reportComment(req, res, next) {
        try {
            const { reason, description } = req.body;
            const report = await CommentService.reportComment(
                req.params.commentId,
                req.user.id,
                reason,
                description
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { report }
            });
        } catch (error) {
            next(error);
        }
    }

    // User-specific Post Operations
    /********************************************************
     * 21. Creating New Post
     *******************************************************/
  async getLikedPostsByUserId(req, res, next) {
        try {
            const result = await InteractionService.getLikedPosts(
                req.params.userId,
                req.query.page,
                req.query.limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 22. Creating New Post
     *******************************************************/
  async getBookmarkedPostsByUserId(req, res, next) {
        try {
            const result = await InteractionService.getBookmarkedPosts(
                req.params.userId,
                req.query.page,
                req.query.limit
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 23. Creating New Post
     *******************************************************/
  async getPostsByTag(req, res, next) {
        try {
            const { tagId } = req.params;
            const { page, limit } = req.query;
            const result = await PostService.getPostsByTag(tagId, page, limit);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 24. Creating New Post
     *******************************************************/
  async updatePostField(req, res, next) {
        try {
            const { id } = req.params;
            const { postField } = req.body;
            const post = await PostService.updatePostField(id, postField);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { post }
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 25. Creating New Post
     *******************************************************/
  async getPostsByCategory(req, res, next) {
        try {
            const { categoryId } = req.params;
            const { page, limit } = req.query;
            const result = await PostService.getPostsByCategory(categoryId, page, limit);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /********************************************************
     * 26. Creating New Post
     *******************************************************/
  async repost(req, res, next) {
        try {
            const { postId } = req.params;
            const { additionalContent } = req.body;
            const repost = await InteractionService.repost(postId, req.user.id, additionalContent);

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { repost }
            });
        } catch (error) {
            next(error);
        }
    }
}


module.exports = {
    PostController: new PostController()
};