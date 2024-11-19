const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {MediaProcessor} = require('../../generalServices/attachmentProcess');
const processor = new MediaProcessor();
const createError = require("http-errors");

class NoticeService {
    async generateUniqueSlug(title) {
        let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let counter = 1;
        let uniqueSlug = slug;
        
        while (await this.isSlugInUse(uniqueSlug)) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }
        return uniqueSlug;
    }

    async isSlugInUse(slug) {
        return slug === 'existing-slug';
    }

    async createNotice(model, data, userId, files, fileUploadPath) {
        const { title, description, content, categories, tags, ...specificFields } = data;

        const mediaEntries = await processor.processContentMedia(
            files,
            fileUploadPath,
            'AUTHOR'
        );

        return prisma[model].create({
            data: {
                title,
                description,
                content,
                ...specificFields,
                authorId: userId,
                slug: await this.generateUniqueSlug(title),
                contentMedia: {
                    create: mediaEntries
                },
                categories: {
                    create: categories.map(categoryId => ({
                        category: {
                            connect: { id: categoryId }
                        }
                    }))
                },
                tags: {
                    create: tags.map(tagId => ({
                        tag: {
                            connect: { id: tagId }
                        }
                    }))
                }
            },
            include: {
                author: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                tags: {
                    include: {
                        tag: true
                    }
                },
                contentMedia: true
            }
        });
    }

    async getAllNotices(model, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc') {
        const skip = (page - 1) * limit;

        const [notices, total] = await Promise.all([
            prisma[model].findMany({
                skip,
                take: Number(limit),
                orderBy: {
                    [sortBy]: order
                },
                include: {
                    author: true,
                    categories: {
                        include: {
                            category: true
                        }
                    },
                    tags: {
                        include: {
                            tag: true
                        }
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
            }),
            prisma[model].count()
        ]);

        return {
            notices,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getNoticeById(model, id) {
        const notice = await prisma[model].findUnique({
            where: { id },
            include: {
                author: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                tags: {
                    include: {
                        tag: true
                    }
                },
                contentMedia: true,
                comments: {
                    include: {
                        author: true,
                        _count: {
                            select: {
                                replies: true,
                                votes: true
                            }
                        }
                    }
                },
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
        });

        if (!notice) throw createError.NotFound("Notice not found");

        await prisma[model].update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });

        return notice;
    }

    async updateNotice(model, id, data, userId, files, fileUploadPath) {
        const { title, description, content, categories, tags, ...specificFields } = data;

        const existingNotice = await prisma[model].findUnique({
            where: { id },
            include: {
                categories: true,
                tags: true
            }
        });

        if (!existingNotice) throw createError.NotFound("Notice not found");
        if (existingNotice.authorId !== userId) throw createError.Forbidden("Not authorized to edit this notice");

        const newAttachments = files ? await processor.processContentMedia(
            files,
            fileUploadPath,
            'AUTHOR'
        ) : [];

        return prisma[model].update({
            where: { id },
            data: {
                title,
                description,
                content,
                ...specificFields,
                slug: title !== existingNotice.title ? await this.generateUniqueSlug(title) : undefined,
                contentMedia: {
                    deleteMany: {},
                    create: newAttachments
                },
                categories: {
                    deleteMany: {},
                    create: categories.map(categoryId => ({
                        category: {
                            connect: { id: categoryId }
                        }
                    }))
                },
                tags: {
                    deleteMany: {},
                    create: tags.map(tagId => ({
                        tag: {
                            connect: { id: tagId }
                        }
                    }))
                }
            },
            include: {
                author: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                tags: {
                    include: {
                        tag: true
                    }
                },
                contentMedia: true
            }
        });
    }

    async deleteNotice(model, id, userId) {
        const notice = await prisma[model].findUnique({
            where: { id }
        });

        if (!notice) throw createError.NotFound("Notice not found");
        if (notice.authorId !== userId) throw createError.Forbidden("Not authorized to delete this notice");

        await prisma[model].delete({
            where: { id }
        });

        return true;
    }


    async getBookmarkedNotices(model, userId, noticeId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [bookmarks, total] = await prisma.$transaction([
            prisma.bookmark.findMany({
                where: {
                    userId,
                    noticeId: noticeId,
                },
                skip,
                take: Number(limit),
                include: {
                    [model]: {
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
                    noticeId: { not: null }
                }
            })
        ]);

        return {
            notices: bookmarks.map(bookmark => bookmark.notice),
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async searchNotices(model, query, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const searchCondition = {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } }
            ]
        };

        const [notices, total] = await Promise.all([
            prisma[model].findMany({
                where: searchCondition,
                skip,
                take: Number(limit),
                include: {
                    author: true,
                    categories: {
                        include: {
                            category: true
                        }
                    },
                    tags: {
                        include: {
                            tag: true
                        }
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
            }),
            prisma[model].count({
                where: searchCondition
            })
        ]);

        return {
            notices,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async reportNotice(model, noticeId, userId, reason, description) {
        return prisma.report.create({
            data: {
                reporterId: userId,
                reportedUserId: noticeId,
                reason,
                description
            }
        });
    }

    async bookmarkNotice(noticeId, userId) {
        return prisma.bookmark.create({
            data: {
                userId,
                noticeEstNiazId: noticeId
            }
        });
    }

    async shareNotice(model, noticeId, userId, platform, customMessage, frontendUrl) {
        const share = await prisma.share.create({
            data: {
                userId,
                noticeEstNiazId: noticeId,
                platform,
                customMessage,
                shareUrl: `${frontendUrl}/notices/${noticeId}`
            }
        });

        await prisma[model].update({
            where: { id: noticeId },
            data: { shareCount: { increment: 1 } }
        });

        return share;
    }
}

module.exports = new NoticeService();