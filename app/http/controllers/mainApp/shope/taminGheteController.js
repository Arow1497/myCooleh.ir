const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../../../utils/functions");

class NoticeTaminGheteShop extends Controller{

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

    // Private helper method for processing media files
    async #processContentMedia(files, fileUploadPath, productId) {
        const mediaEntries = [];
        
        // Process images
        const images = ListOfImagesFromRequest(files || [], fileUploadPath);
        for (const image of images) {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            mediaEntries.push({
                url: image,
                filename: path.basename(image),
                type: 'IMAGE',
                fileSize: fileInfo?.size?.toString() || '0',
                mimeType: fileInfo?.mimetype || 'image/jpeg',
                dimensions: { width: 0, height: 0 },  // Replace with actual dimensions if available
                status: 'COMPLETED',
                productId
            });
        }

        // Process audio files
        const audioFiles = files?.audio || [];
        if (Array.isArray(audioFiles) && audioFiles.length > 0) {
            const audioFile = audioFiles[0];
            const audioAddress = path.join(fileUploadPath, audioFile.filename).replace(/\\/g, "/");
            const audioURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${audioAddress}`;
            
            try {
                const seconds = await audioSeconds(audioURL);
                mediaEntries.push({
                    url: audioAddress,
                    filename: audioFile.filename,
                    type: 'AUDIO',
                    fileSize: audioFile.size.toString(),
                    mimeType: audioFile.mimetype,
                    duration: getTime(seconds),
                    status: 'COMPLETED',
                    productId
                });
            } catch (error) {
                console.error("Error processing audio file:", error);
            }
        }

        // Process video files
        const videoFiles = files?.video || [];
        if (Array.isArray(videoFiles) && videoFiles.length > 0) {
            const videoFile = videoFiles[0];
            const videoAddress = path.join(fileUploadPath, videoFile.filename).replace(/\\/g, "/");
            const videoURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`;

            try {
                const seconds = await getVideoDurationInSeconds(videoURL);
                const duration = getTime(seconds);
                
                mediaEntries.push({
                    url: videoAddress,
                    filename: videoFile.filename,
                    type: 'VIDEO',
                    fileSize: videoFile.size.toString(),
                    mimeType: videoFile.mimetype,
                    duration,
                    status: 'COMPLETED',
                    productId
                });
            } catch (error) {
                console.error("Error calculating video duration:", error);
            }
        }

        return mediaEntries;
    }

///////////////////////////////////////////////////////////////////////////////////////////


async createNoticeTaminGhete(req, res, next) {
    try {
        const { title, description, content, noticeTaminGheteField, noticeTaminGheteType, categories, tags } = req.body;
        const userId = req.user.id;

        // Process mediaEntries if any
        const mediaEntries = await this.#processContentMedia(
            req.files,
            req.body.fileUploadPath,
            'AUTHOR'
        );

        // Create noticeTaminGhete with all relations
        const noticeTaminGhete = await prisma.noticeTaminGhete.create({
            data: {
                title,
                description,
                content,
                noticeTaminGheteField,
                noticeTaminGheteType,
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
                noticeTaminGhete
            }
        });
    } catch (error) {
        next(error);
    }
}

async getAllNoticeTaminGhetes(req, res, next) {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const noticeTaminGhetes = await prisma.noticeTaminGhete.findMany({
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

        const total = await prisma.noticeTaminGhete.count();

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeTaminGhetes,
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

async getOneNoticeTaminGheteById(req, res, next) {
    try {
        const { id } = req.params;

        const noticeTaminGhete = await prisma.noticeTaminGhete.findUnique({
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

        if (!noticeTaminGhete) throw createError.NotFound("NoticeTaminGhete not found");

        // Increment view count
        await prisma.noticeTaminGhete.update({
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
                noticeTaminGhete
            }
        });
    } catch (error) {
        next(error);
    }
}

async editNoticeTaminGheteById(req, res, next) {
    try {
        const { id } = req.params;
        const { title, description, content, noticeTaminGheteField, noticeTaminGheteType, categories, tags } = req.body;
        const userId = req.user.id;

        const existingNoticeTaminGhete = await prisma.noticeTaminGhete.findUnique({
            where: { id },
            include: {
                categories: true,
                tags: true
            }
        });

        if (!existingNoticeTaminGhete) throw createError.NotFound("NoticeTaminGhete not found");
        if (existingNoticeTaminGhete.authorId !== userId) throw createError.Forbidden("Not authorized to edit this noticeTaminGhete");

        // Process new mediaEntries if any
        const newAttachments = req.files ? await this.#processContentMedia(
            req.files,
            req.body.fileUploadPath,
            'AUTHOR'
        ) : [];

        // Update noticeTaminGhete with all relations
        const updatedNoticeTaminGhete = await prisma.noticeTaminGhete.update({
            where: { id },
            data: {
                title,
                description,
                content,
                noticeTaminGheteField,
                noticeTaminGheteType,
                slug: title !== existingNoticeTaminGhete.title ? await this.#generateUniqueSlug(title) : undefined,
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
                noticeTaminGhete: updatedNoticeTaminGhete
            }
        });
    } catch (error) {
        next(error);
    }
}

async removeNoticeTaminGheteById(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const noticeTaminGhete = await prisma.noticeTaminGhete.findUnique({
            where: { id }
        });

        if (!noticeTaminGhete) throw createError.NotFound("NoticeTaminGhete not found");
        if (noticeTaminGhete.authorId !== userId) throw createError.Forbidden("Not authorized to delete this noticeTaminGhete");

        await prisma.noticeTaminGhete.delete({
            where: { id }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            message: "NoticeTaminGhete deleted successfully"
        });
    } catch (error) {
        next(error);
    }
}

async getNoticeTaminGhetesByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const noticeTaminGhetes = await prisma.noticeTaminGhete.findMany({
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

        const total = await prisma.noticeTaminGhete.count({
            where: {
                authorId: userId
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeTaminGhetes,
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

async getLikedNoticeTaminGhetesByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const likes = await prisma.like.findMany({
            where: {
                userId,
                noticeTaminGheteId: {
                    not: null
                }
            },
            skip,
            take: Number(limit),
            include: {
                noticeTaminGhete: {
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

        const total = await prisma.like.count({
            where: {
                userId,
                noticeTaminGheteId: {
                    not: null
                }
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeTaminGhetes: likes.map(like => like.noticeTaminGhete),
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

async getBookmarkedNoticeTaminGhetesByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId,
                noticeTaminGheteId: {
                    not: null
                }
            },
            skip,
            take: Number(limit),
            include: {
                noticeTaminGhete: {
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
                noticeTaminGheteId: {
                    not: null
                }
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeTaminGhetes: bookmarks.map(bookmark => bookmark.noticeTaminGhete),
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

async searchNoticeTaminGhetes(req, res, next) {
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

        // const [noticeTaminGhetes, total] = await prisma.$transaction([
        //     prisma.noticeTaminGhete.findMany({
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
        //     prisma.noticeTaminGhete.count({ where })
        // ]);
        const { q, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const noticeTaminGhetes = await prisma.noticeTaminGhete.findMany({
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

        const total = await prisma.noticeTaminGhete.count({
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
                noticeTaminGhetes,
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

// RenoticeTaminGhete a noticeTaminGhete
async renoticeTaminGhete(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const { additionalContent } = req.body;
        const userId = req.user.id;

        // Get original noticeTaminGhete
        const originalNoticeTaminGhete = await prisma.noticeTaminGhete.findUnique({
            where: { id: noticeTaminGheteId },
            include: { author: true }
        });

        if (!originalNoticeTaminGhete) throw createError.NotFound("Original noticeTaminGhete not found");

        // Create renoticeTaminGhete record
        const renoticeTaminGhete = await prisma.renoticeTaminGhete.create({
            data: {
                userId,
                noticeTaminGheteId,
                originalNoticeTaminGheteerId: originalNoticeTaminGhete.authorId,
                additionalContent
            }
        });

        // Increment renoticeTaminGhete count on original noticeTaminGhete
        await prisma.noticeTaminGhete.update({
            where: { id: noticeTaminGheteId },
            data: { renoticeTaminGheteCount: { increment: 1 } }
        });

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: { renoticeTaminGhete }
        });
    } catch (error) {
        next(error);
    }
}

// Bookmark a noticeTaminGhete
async bookmarkNoticeTaminGhete(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const userId = req.user.id;

        const bookmark = await prisma.bookmark.create({
            data: {
                userId,
                noticeTaminGheteId
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

// Like a noticeTaminGhete
async likeNoticeTaminGhete(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const userId = req.user.id;

        // Remove any existing dislike
        await prisma.dislike.deleteMany({
            where: {
                noticeTaminGheteId,
                userId
            }
        });

        const like = await prisma.like.create({
            data: {
                userId,
                noticeTaminGheteId
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

// Dislike a noticeTaminGhete
async dislikeNoticeTaminGhete(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const userId = req.user.id;

        // Remove any existing like
        await prisma.like.deleteMany({
            where: {
                noticeTaminGheteId,
                userId
            }
        });

        const dislike = await prisma.dislike.create({
            data: {
                userId,
                noticeTaminGheteId
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

// Share a noticeTaminGhete
async shareNoticeTaminGhete(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const { platform, customMessage } = req.body;
        const userId = req.user.id;

        const share = await prisma.share.create({
            data: {
                userId,
                noticeTaminGheteId,
                platform,
                customMessage,
                shareUrl: `${process.env.FRONTEND_URL}/noticeTaminGhetes/${noticeTaminGheteId}`
            }
        });

        // Increment share count
        await prisma.noticeTaminGhete.update({
            where: { id: noticeTaminGheteId },
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

// Report a noticeTaminGhete
async reportNoticeTaminGhete(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const { reason, description } = req.body;
        const userId = req.user.id;

        const report = await prisma.report.create({
            data: {
                reporterId: userId,
                reportedUserId: noticeTaminGheteId,
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

// Create a comment
async createComment(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const { content, parentId } = req.body;
        const userId = req.user.id;

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
                noticeTaminGheteId,
                authorId: userId,
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

// Get noticeTaminGhete comments
async getNoticeTaminGheteComments(req, res, next) {
    try {
        const { noticeTaminGheteId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [comments, total] = await prisma.$transaction([
            prisma.comment.findMany({
                where: {
                    noticeTaminGheteId,
                    parentId: null // Only get top-level comments
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
                    noticeTaminGheteId,
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

// Update a comment
async updateComment(req, res, next) {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) throw createError.NotFound("Comment not found");
        if (comment.authorId !== userId) throw createError.Forbidden("Not authorized to update this comment");

        const updatedComment = await prisma.comment.update({
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

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: { comment: updatedComment }
        });
    } catch (error) {
        next(error);
    }
}

// Vote on a comment
async voteComment(req, res, next) {
    try {
        const { commentId } = req.params;
        const { voteType } = req.body;
        const userId = req.user.id;

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

        // Update vote counts
        const upvotes = await prisma.commentVote.count({
            where: {
                commentId,
                voteType: 'UPVOTE'
            }
        });

        const downvotes = await prisma.commentVote.count({
            where: {
                commentId,
                voteType: 'DOWNVOTE'
            }
        });

        await prisma.comment.update({
            where: { id: commentId },
            data: {
                upvotes,
                downvotes
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: { vote }
        });
    } catch (error) {
        next(error);
    }
}

// Report a comment
async reportComment(req, res, next) {
    try {
        const { commentId } = req.params;
        const { reason, description } = req.body;
        const userId = req.user.id;

        const report = await prisma.commentReport.create({
            data: {
                commentId,
                reporterId: userId,
                reason,
                description
            }
        });

        // Increment report count on comment
        await prisma.comment.update({
            where: { id: commentId },
            data: {
                reportCount: { increment: 1 }
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

// Delete a comment
async deleteComment(req, res, next) {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) throw createError.NotFound("Comment not found");
        if (comment.authorId !== userId) throw createError.Forbidden("Not authorized to delete this comment");

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
    
  
   }
module.exports = {
    NoticeTaminGheteShop: new NoticeTaminGheteShop()
}