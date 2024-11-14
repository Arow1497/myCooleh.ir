const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../../../../utils/functions");

class PostController extends Controller {
    // Create new post
    async createPost(req, res, next) {
        try {
            const { title, description, content, postField, postType, categories, tags } = req.body;
            const authorId = req.user.id;
            
            const post = await prisma.post.create({
                data: {
                    title,
                    description,
                    content,
                    postField,
                    postType,
                    authorId,
                    slug: await this.generateUniqueSlug(title),
                    categories: {
                        create: categories.map(categoryId => ({
                            category: { connect: { id: categoryId } }
                        }))
                    },
                    tags: {
                        create: tags.map(tagId => ({
                            tag: { connect: { id: tagId } }
                        }))
                    }
                },
                include: {
                    author: true,
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } }
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { post }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get all posts with pagination
    async getAllPosts(req, res, next) {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
            const skip = (page - 1) * limit;

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    skip,
                    take: Number(limit),
                    orderBy: { [sortBy]: order },
                    include: {
                        author: true,
                        categories: { include: { category: true } },
                        tags: { include: { tag: true } },
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count()
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get one post by ID
    async getOnePostById(req, res, next) {
        try {
            const { id } = req.params;
            
            const post = await prisma.post.findUnique({
                where: { id },
                include: {
                    author: true,
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } },
                    comments: {
                        where: { parentId: null },
                        include: {
                            author: true,
                            _count: { select: { replies: true } }
                        }
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                            shares: true
                        }
                    }
                }
            });

            if (!post) throw createError.NotFound("Post not found");

            // Increment view count
            await prisma.post.update({
                where: { id },
                data: { viewCount: { increment: 1 } }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { post }
            });
        } catch (error) {
            next(error);
        }
    }

    // Update post
    async editPostById(req, res, next) {
        try {
            const { id } = req.params;
            const { title, description, content, postField, postType, categories, tags } = req.body;
            const userId = req.user.id;

            const post = await prisma.post.findUnique({
                where: { id },
                select: { authorId: true }
            });

            if (!post) throw createError.NotFound("Post not found");
            if (post.authorId !== userId) throw createError.Forbidden("You can only edit your own posts");

            const updatedPost = await prisma.post.update({
                where: { id },
                data: {
                    title,
                    description,
                    content,
                    postField,
                    postType,
                    categories: {
                        deleteMany: {},
                        create: categories.map(categoryId => ({
                            category: { connect: { id: categoryId } }
                        }))
                    },
                    tags: {
                        deleteMany: {},
                        create: tags.map(tagId => ({
                            tag: { connect: { id: tagId } }
                        }))
                    }
                },
                include: {
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { post: updatedPost }
            });
        } catch (error) {
            next(error);
        }
    }

    // Delete post
    async removePostById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const post = await prisma.post.findUnique({
                where: { id },
                select: { authorId: true }
            });

            if (!post) throw createError.NotFound("Post not found");
            if (post.authorId !== userId) throw createError.Forbidden("You can only delete your own posts");

            await prisma.post.delete({ where: { id } });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Post deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Get posts by user ID
    async getPostsByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    where: { authorId: userId },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count({ where: { authorId: userId } })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get liked posts by user ID
    async getLikedPostsByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    where: {
                        likes: {
                            some: { userId }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: true,
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count({
                    where: {
                        likes: {
                            some: { userId }
                        }
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get bookmarked posts by user ID
    async getBookmarkedPostsByUserId(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    where: {
                        bookmarks: {
                            some: { userId }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: true,
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count({
                    where: {
                        bookmarks: {
                            some: { userId }
                        }
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Search posts
    async searchPosts(req, res, next) {
        try {
            const { q, page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    where: {
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { content: { contains: q, mode: 'insensitive' } }
                        ]
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: true,
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count({
                    where: {
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { content: { contains: q, mode: 'insensitive' } }
                        ]
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get trending posts
    async getTrendingPosts(req, res, next) {
        try {
            const { timeframe = '24h', page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            let dateFilter = new Date();
            switch (timeframe) {
                case '24h':
                    dateFilter.setHours(dateFilter.getHours() - 24);
                    break;
                case '7d':
                    dateFilter.setDate(dateFilter.getDate() - 7);
                    break;
                case '30d':
                    dateFilter.setDate(dateFilter.getDate() - 30);
                    break;
                default:
                    dateFilter.setHours(dateFilter.getHours() - 24);
            }

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    where: {
                        createdAt: {
                            gte: dateFilter
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: [
                        { viewCount: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    include: {
                        author: true,
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count({
                    where: {
                        createdAt: {
                            gte: dateFilter
                        }
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

   // Continuing PostController class...

    // Get posts by category
    async getPostsByCategory(req, res, next) {
        try {
            const { categoryId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [posts, total] = await prisma.$transaction([
                prisma.post.findMany({
                    where: {
                        categories: {
                            some: { categoryId }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: true,
                        categories: { include: { category: true } },
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true
                            }
                        }
                    }
                }),
                prisma.post.count({
                    where: {
                        categories: {
                            some: { categoryId }
                        }
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    posts,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Repost functionality
    async repost(req, res, next) {
        try {
            const { postId } = req.params;
            const { additionalContent } = req.body;
            const userId = req.user.id;

            const originalPost = await prisma.post.findUnique({
                where: { id: postId },
                include: { author: true }
            });

            if (!originalPost) throw createError.NotFound("Original post not found");

            const repost = await prisma.$transaction([
                prisma.repost.create({
                    data: {
                        userId,
                        postId,
                        originalPosterId: originalPost.authorId,
                        additionalContent
                    }
                }),
                prisma.post.update({
                    where: { id: postId },
                    data: { repostCount: { increment: 1 } }
                })
            ]);

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { repost }
            });
        } catch (error) {
            next(error);
        }
    }

    // Like post
    async likePost(req, res, next) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const existingLike = await prisma.like.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });

            if (existingLike) {
                throw createError.BadRequest("Post already liked");
            }

            const like = await prisma.like.create({
                data: {
                    userId,
                    postId
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { like }
            });
        } catch (error) {
            next(error);
        }
    }

    // Dislike post
    async dislikePost(req, res, next) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const existingDislike = await prisma.dislike.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });

            if (existingDislike) {
                throw createError.BadRequest("Post already disliked");
            }

            const dislike = await prisma.dislike.create({
                data: {
                    userId,
                    postId
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { dislike }
            });
        } catch (error) {
            next(error);
        }
    }

    // Bookmark post
    async bookmarkPost(req, res, next) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const existingBookmark = await prisma.bookmark.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });

            if (existingBookmark) {
                throw createError.BadRequest("Post already bookmarked");
            }

            const bookmark = await prisma.bookmark.create({
                data: {
                    userId,
                    postId
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { bookmark }
            });
        } catch (error) {
            next(error);
        }
    }

    // Share post
    async sharePost(req, res, next) {
        try {
            const { postId } = req.params;
            const { platform, customMessage } = req.body;
            const userId = req.user.id;

            const share = await prisma.share.create({
                data: {
                    userId,
                    postId,
                    platform,
                    customMessage,
                    shareUrl: await this.generateShareUrl(postId)
                }
            });

            await prisma.post.update({
                where: { id: postId },
                data: { shareCount: { increment: 1 } }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { share }
            });
        } catch (error) {
            next(error);
        }
    }

    // Report post
    async reportPost(req, res, next) {
        try {
            const { postId } = req.params;
            const { reason, description } = req.body;
            const userId = req.user.id;

            const report = await prisma.report.create({
                data: {
                    reporterId: userId,
                    postId,
                    reason,
                    description
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { report }
            });
        } catch (error) {
            next(error);
        }
    }

    // Comment handlers
    async createComment(req, res, next) {
        try {
            const { postId } = req.params;
            const { content, parentId } = req.body;
            const authorId = req.user.id;

            let depth = 0;
            let path = '';

            if (parentId) {
                const parentComment = await prisma.comment.findUnique({
                    where: { id: parentId }
                });
                if (!parentComment) throw createError.NotFound("Parent comment not found");
                depth = parentComment.depth + 1;
                path = `${parentComment.path}/${parentId}`;
            }

            const comment = await prisma.comment.create({
                data: {
                    content,
                    authorId,
                    postId,
                    parentId,
                    depth,
                    path
                },
                include: {
                    author: true
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { comment }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get post comments
    async getPostComments(req, res, next) {
        try {
            const { postId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [comments, total] = await prisma.$transaction([
                prisma.comment.findMany({
                    where: { 
                        postId,
                        parentId: null // Only get top-level comments
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: true,
                        _count: {
                            select: { replies: true }
                        }
                    }
                }),
                prisma.comment.count({
                    where: {
                        postId,
                        parentId: null
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    comments,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get comment replies
    async getCommentReplies(req, res, next) {
        try {
            const { commentId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [replies, total] = await prisma.$transaction([
                prisma.comment.findMany({
                    where: { parentId: commentId },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: true,
                        _count: {
                            select: { replies: true }
                        }
                    }
                }),
                prisma.comment.count({
                    where: { parentId: commentId }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    replies,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Update comment
    async updateComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const { content } = req.body;
            const userId = req.user.id;

            const comment = await prisma.comment.findUnique({
                where: { id: commentId }
            });

            if (!comment) throw createError.NotFound("Comment not found");
            if (comment.authorId !== userId) throw createError.Forbidden("You can only edit your own comments");

            const updatedComment = await prisma.comment.update({
                where: { id: commentId },
                data: {
                    content,
                    isEdited: true,
                    editedAt: new Date()
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { comment: updatedComment }
            });
        } catch (error) {
            next(error);
        }
    }

    // Vote on comment
    async voteComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const { voteType } = req.body;
            const userId = req.user.id;

            const existingVote = await prisma.commentVote.findUnique({
                where: {
                    userId_commentId: {
                        userId,
                        commentId
                    }
                }
            });

            if (existingVote) {
                if (existingVote.voteType === voteType) {
                    throw createError.BadRequest("Vote already exists");
                }

                // Change vote type
                const updatedVote = await prisma.commentVote.update({
                    where: {
                        userId_commentId: {
                            userId,
                            commentId
                        }
                    },
                    data: { voteType }
                });

                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    data: { vote: updatedVote }
                });
            }

            const vote = await prisma.commentVote.create({
                data: {
                    userId,
                    commentId,
                    voteType
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { vote }
            });
        } catch (error) {
            next(error);
        }
    }

    // Report comment
    async reportComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const { reason, description } = req.body;
            const reporterId = req.user.id;

            const report = await prisma.commentReport.create({
                data: {
                    commentId,
                    reporterId,
                    reason,
                    description
                }
            });

            await prisma.comment.update({
                where: { id: commentId },
                data: { reportCount: { increment: 1 } }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { report }
            });
        } catch (error) {
            next(error);
        }
    }

    // Delete comment
    async deleteComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const comment = await prisma.comment.findUnique({
                where: { id: commentId }
            });

            if (!comment) throw createError.NotFound("Comment not found");
            if (comment.authorId !== userId) throw createError.Forbidden("You can only delete your own comments");

            await prisma.comment.delete({
                where: { id: commentId }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Comment deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Helper methods
    async generateUniqueSlug(title) {
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        let slug = baseSlug;
        let counter = 1;
        
        while (await prisma.post.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        return slug;
    }

    async generateShareUrl(postId) {
        // Implement your share URL generation logic here
        return `${process.env.FRONTEND_URL}/posts/${postId}`;
    }
}

module.exports = {
    PostController: new PostController();
}