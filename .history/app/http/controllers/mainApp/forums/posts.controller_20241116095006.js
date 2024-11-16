const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const PostService = require("../../services/posts/post.service");
const InteractionService = require("../../services/posts/interaction.service");
const CommentService = require("../../services/posts/comment.service");

class PostController extends Controller {
    // Post CRUD Operations
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
}

module.exports = {
    PostController: new PostController()
};