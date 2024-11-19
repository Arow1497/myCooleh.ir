const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {MediaProcessor} = require('../../../generalServices/attachmentProcess');
const processor = new MediaProcessor();

class NoticeEstNiazForum extends Controller{

/////////////////////////////////////////////////////////////////////////////////////////
 // PRIVATE HELPERS
    /**
     * Generate a unique slug from a given title string.
     * 
     * @param {string} title - The title to be converted to a slug.
     * @returns {string} - The generated unique slug.
     */
    async #generateUniqueSlug(title) {
        // Normalize the title to lowercase and remove special characters
        let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
        // Check if the slug is already in use
        let counter = 1;
        let uniqueSlug = slug;
        while (await this.isSlugInUse(uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
        }
    
        return uniqueSlug;
    }
    /**
     * Check if a given slug is already in use.
     * 
     * @param {string} slug - The slug to check.
     * @returns {boolean} - True if the slug is in use, false otherwise.
     */
    async isSlugInUse(slug) {
        // Here you would implement logic to check if the slug is already used, e.g. by querying a database
        // For the sake of this example, let's assume this is a simple check
        return slug === 'existing-slug';
    }


async createNoticeEstNiaz(req, res, next) {
    try {
        const { title, description, content, noticeEstNiazField, noticeEstNiazType, categories, tags } = req.body;
        const userId = req.user.id;

        // Process mediaEntries if any
        const mediaEntries = await processor.processContentMedia(
            req.files,
            req.body.fileUploadPath,
            'AUTHOR'
        );

        // Create noticeEstNiaz with all relations
        const noticeEstNiaz = await prisma.noticeEstNiaz.create({
            data: {
                title,
                description,
                content,
                noticeEstNiazField,
                noticeEstNiazType,
                authorId: userId,
                slug: await this.#generateUniqueSlug(title),
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

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: {
                noticeEstNiaz
            }
        });
    } catch (error) {
        next(error);
    }
}

async getAllNoticeEstNiazs(req, res, next) {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const noticeEstNiazs = await prisma.noticeEstNiaz.findMany({
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
        });

        const total = await prisma.noticeEstNiaz.count();

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeEstNiazs,
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

async getOneNoticeEstNiazById(req, res, next) {
    try {
        const { id } = req.params;

        const noticeEstNiaz = await prisma.noticeEstNiaz.findUnique({
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

        if (!noticeEstNiaz) throw createError.NotFound("NoticeEstNiaz not found");

        // Increment view count
        await prisma.noticeEstNiaz.update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeEstNiaz
            }
        });
    } catch (error) {
        next(error);
    }
}

async editNoticeEstNiazById(req, res, next) {
    try {
        const { id } = req.params;
        const { title, description, content, noticeEstNiazField, noticeEstNiazType, categories, tags } = req.body;
        const userId = req.user.id;

        const existingNoticeEstNiaz = await prisma.noticeEstNiaz.findUnique({
            where: { id },
            include: {
                categories: true,
                tags: true
            }
        });

        if (!existingNoticeEstNiaz) throw createError.NotFound("NoticeEstNiaz not found");
        if (existingNoticeEstNiaz.authorId !== userId) throw createError.Forbidden("Not authorized to edit this noticeEstNiaz");

        // Process new mediaEntries if any
        const newAttachments = req.files ? await processor.processContentMedia(
            req.files,
            req.body.fileUploadPath,
            'AUTHOR'
        ) : [];

        // Update noticeEstNiaz with all relations
        const updatedNoticeEstNiaz = await prisma.noticeEstNiaz.update({
            where: { id },
            data: {
                title,
                description,
                content,
                noticeEstNiazField,
                noticeEstNiazType,
                slug: title !== existingNoticeEstNiaz.title ? await this.#generateUniqueSlug(title) : undefined,
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

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeEstNiaz: updatedNoticeEstNiaz
            }
        });
    } catch (error) {
        next(error);
    }
}

async removeNoticeEstNiazById(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const noticeEstNiaz = await prisma.noticeEstNiaz.findUnique({
            where: { id }
        });

        if (!noticeEstNiaz) throw createError.NotFound("NoticeEstNiaz not found");
        if (noticeEstNiaz.authorId !== userId) throw createError.Forbidden("Not authorized to delete this noticeEstNiaz");

        await prisma.noticeEstNiaz.delete({
            where: { id }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            message: "NoticeEstNiaz deleted successfully"
        });
    } catch (error) {
        next(error);
    }
}

async getNoticeEstNiazsByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const noticeEstNiazs = await prisma.noticeEstNiaz.findMany({
            where: {
                authorId: userId
            },
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
        });

        const total = await prisma.noticeEstNiaz.count({
            where: {
                authorId: userId
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeEstNiazs,
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

async getBookmarkedNoticeEstNiazsByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId,
                noticeEstNiazId: {
                    not: null
                }
            },
            skip,
            take: Number(limit),
            include: {
                noticeEstNiaz: {
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
                }
            }
        });

        const total = await prisma.bookmark.count({
            where: {
                userId,
                noticeEstNiazId: {
                    not: null
                }
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeEstNiazs: bookmarks.map(bookmark => bookmark.noticeEstNiaz),
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

async searchNoticeEstNiazs(req, res, next) {
    try {
        // const { q, category, tag, page = 1, limit = 10 } = req.query;
        // const skip = (page - 1) * limit;

        // const where = {
        //     OR: [
        //         { title: { contains: q, mode: 'insensitive' } },
        //         { description: { contains: q, mode: 'insensitive' } },
        //         { content: { contains: q, mode: 'insensitive' } }
        //     ]
        // };

        // if (category) {
        //     where.categories = {
        //         some: {
        //             categoryId: category
        //         }
        //     };
        // }

        // if (tag) {
        //     where.tags = {
        //         some: {
        //             tagId: tag
        //         }
        //     };
        // }

        // const [noticeEstNiazs, total] = await prisma.$transaction([
        //     prisma.noticeEstNiaz.findMany({
        //         where,
        //         skip,
        //         take: Number(limit),
        //         include: {
        //             author: true,
        //             categories: true,
        //             tags: true,
        //             contentMedia: true,
        //             _count: {
        //                 select: {
        //                     comments: true,
        //                     likes: true,
        //                     dislikes: true
        //                 }
        //             }
        //         }
        //     }),
        //     prisma.noticeEstNiaz.count({ where })
        // ]);
        const { q, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const noticeEstNiazs = await prisma.noticeEstNiaz.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { content: { contains: q, mode: 'insensitive' } }
                ]
            },
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
        });

        const total = await prisma.noticeEstNiaz.count({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { content: { contains: q, mode: 'insensitive' } }
                ]
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeEstNiazs,
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

// Report a noticeEstNiaz
async reportNoticeEstNiaz(req, res, next) {
    try {
        const { noticeEstNiazId } = req.params;
        const { reason, description } = req.body;
        const userId = req.user.id;

        const report = await prisma.report.create({
            data: {
                reporterId: userId,
                reportedUserId: noticeEstNiazId,
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

// Bookmark a noticeEstNiaz
async bookmarkNoticeEstNiaz(req, res, next) {
    try {
        const { noticeEstNiazId } = req.params;
        const userId = req.user.id;

        const bookmark = await prisma.bookmark.create({
            data: {
                userId,
                noticeEstNiazId
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

// Share a noticeEstNiaz
async shareNoticeEstNiaz(req, res, next) {
    try {
        const { noticeEstNiazId } = req.params;
        const { platform, customMessage } = req.body;
        const userId = req.user.id;

        const share = await prisma.share.create({
            data: {
                userId,
                noticeEstNiazId,
                platform,
                customMessage,
                shareUrl: `${process.env.FRONTEND_URL}/noticeEstNiazs/${noticeEstNiazId}`
            }
        });

        // Increment share count
        await prisma.noticeEstNiaz.update({
            where: { id: noticeEstNiazId },
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


   }
module.exports = {
    NoticeEstNiazForum: new NoticeEstNiazForum()
}