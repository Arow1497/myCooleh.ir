const { PrismaClient } = require('@prisma/client');
const createError = require("http-errors");

const prisma = new PrismaClient();

class PostInteractionService {
    async likePost(postId, userId) {
        await prisma.dislike.deleteMany({
            where: { postId, userId }
        });

        return prisma.like.create({
            data: { userId, postId }
        });
    }

    async dislikePost(postId, userId) {
        await prisma.like.deleteMany({
            where: { postId, userId }
        });

        return prisma.dislike.create({
            data: { userId, postId }
        });
    }

    async bookmarkPost(postId, userId) {
        return prisma.bookmark.create({
            data: { userId, postId }
        });
    }

    async sharePost(postId, userId, platform, customMessage) {
        const share = await prisma.share.create({
            data: {
                userId,
                postId,
                platform,
                customMessage,
                shareUrl: `${process.env.FRONTEND_URL}/posts/${postId}`
            }
        });

        await prisma.post.update({
            where: { id: postId },
            data: { shareCount: { increment: 1 } }
        });

        return share;
    }

    async reportPost(postId, userId, reason, description) {
        return prisma.report.create({
            data: {
                reporterId: userId,
                reportedUserId: postId,
                reason,
                description
            }
        });
    }

    async getLikedPosts(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [likes, total] = await prisma.$transaction([
            prisma.like.findMany({
                where: {
                    userId,
                    postId: { not: null }
                },
                skip,
                take: Number(limit),
                include: {
                    post: {
                        include: {
                            author: true,
                            categories: {
                                include: { category: true }
                            },
                            tags: {
                                include: { tag: true }
                            },
                            contentMedia: true,
                            _count: {
                                select: {
                                    comments: true,
                                    likes: true,
                                    dislikes: true,
                                    bookmarks: true,
                                    shares: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.like.count({
                where: {
                    userId,
                    postId: { not: null }
                }
            })
        ]);

        return {
            posts: likes.map(like => like.post),
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getBookmarkedPosts(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [bookmarks, total] = await prisma.$transaction([
            prisma.bookmark.findMany({
                where: {
                    userId,
                    postId: { not: null }
                },
                skip,
                take: Number(limit),
                include: {
                    post: {
                        include: {
                            author: true,
                            categories: {
                                include: { category: true }
                            },
                            tags: {
                                include: { tag: true }
                            },
                            contentMedia: true,
                            _count: {
                                select: {
                                    comments: true,
                                    likes: true,
                                    dislikes: true,
                                    bookmarks: true,
                                    shares: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.bookmark.count({
                where: {
                    userId,
                    postId: { not: null }
                }
            })
        ]);

        return {
            posts: bookmarks.map(bookmark => bookmark.post),
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new PostInteractionService();