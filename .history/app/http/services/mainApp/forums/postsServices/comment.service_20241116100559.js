const { PrismaClient } = require('@prisma/client');
const createError = require("http-errors");

const prisma = new PrismaClient();

class CommentService {
    async createComment(postId, userId, content, parentId) {
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

        return prisma.comment.create({
            data: {
                content,
                postId,
                authorId: userId,
                parentId,
                depth,
                path
            },
            include: {
                author: true
            }
        });
    }

    async getPostComments(postId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [comments, total] = await prisma.$transaction([
            prisma.comment.findMany({
                where: {
                    postId,
                    parentId: null
                },
                skip,
                take: Number(limit),
                include: {
                    author: true,
                    _count: {
                        select: {
                            replies: true,
                            votes: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.comment.count({
                where: {
                    postId,
                    parentId: null
                }
            })
        ]);

        return {
            comments,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getCommentReplies(commentId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [replies, total] = await prisma.$transaction([
            prisma.comment.findMany({
                where: {
                    parentId: commentId
                },
                skip,
                take: Number(limit),
                include: {
                    author: true,
                    _count: {
                        select: {
                            replies: true,
                            votes: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                }
            }),
            prisma.comment.count({
                where: {
                    parentId: commentId
                }
            })
        ]);

        return {
            replies,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async updateComment(commentId, userId, content) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) throw createError.NotFound("Comment not found");
        if (comment.authorId !== userId) throw createError.Forbidden("Not authorized to update this comment");

        return prisma.comment.update({
            where: { id: commentId },
            data: {
                content,
                isEdited: true,
                editedAt: new Date()
            },
            include: {
                author: true
            }
        });
    }

    async deleteComment(commentId, userId) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) throw createError.NotFound("Comment not found");
        if (comment.authorId !== userId) throw createError.Forbidden("Not authorized to delete this comment");

        await prisma.comment.delete({
            where: { id: commentId }
        });
        return true;
    }

    async voteComment(commentId, userId, voteType) {
        const vote = await prisma.commentVote.upsert({
            where: {
                userId_commentId: {
                    userId,
                    commentId
                }
            },
            update: {
                voteType
            },
            create: {
                userId,
                commentId,
                voteType
            }
        });

        const [upvotes, downvotes] = await Promise.all([
            prisma.commentVote.count({
                where: {
                    commentId,
                    voteType: 'UPVOTE'
                }
            }),
            prisma.commentVote.count({
                where: {
                    commentId,
                    voteType: 'DOWNVOTE'
                }
            })
        ]);

        await prisma.comment.update({
            where: { id: commentId },
            data: {
                upvotes,
                downvotes
            }
        });

        return vote;
    }

    async reportComment(commentId, userId, reason, description) {
        const report = await prisma.commentReport.create({
            data: {
                commentId,
                reporterId: userId,
                reason,
                description
            }
        });

        await prisma.comment.update({
            where: { id: commentId },
            data: {
                reportCount: { increment: 1 }
            }
        });

        return report;
    }
}

module.exports = new CommentService();



