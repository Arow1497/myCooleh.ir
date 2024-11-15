const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../../../utils/functions");

class NoticeDivarForum extends Controller{

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


async createNoticeDivar(req, res, next) {
    try {
        const { title, description, content, noticeDivarField, noticeDivarType, categories, tags } = req.body;
        const userId = req.user.id;

        // Process mediaEntries if any
        const mediaEntries = await this.#processContentMedia(
            req.files,
            req.body.fileUploadPath,
            'AUTHOR'
        );

        // Create noticeDivar with all relations
        const noticeDivar = await prisma.noticeDivar.create({
            data: {
                title,
                description,
                content,
                noticeDivarField,
                noticeDivarType,
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
                noticeDivar
            }
        });
    } catch (error) {
        next(error);
    }
}

async getAllNoticeDivars(req, res, next) {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const noticeDivars = await prisma.noticeDivar.findMany({
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

        const total = await prisma.noticeDivar.count();

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeDivars,
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

async getOneNoticeDivarById(req, res, next) {
    try {
        const { id } = req.params;

        const noticeDivar = await prisma.noticeDivar.findUnique({
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

        if (!noticeDivar) throw createError.NotFound("NoticeDivar not found");

        // Increment view count
        await prisma.noticeDivar.update({
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
                noticeDivar
            }
        });
    } catch (error) {
        next(error);
    }
}

async editNoticeDivarById(req, res, next) {
    try {
        const { id } = req.params;
        const { title, description, content, noticeDivarField, noticeDivarType, categories, tags } = req.body;
        const userId = req.user.id;

        const existingNoticeDivar = await prisma.noticeDivar.findUnique({
            where: { id },
            include: {
                categories: true,
                tags: true
            }
        });

        if (!existingNoticeDivar) throw createError.NotFound("NoticeDivar not found");
        if (existingNoticeDivar.authorId !== userId) throw createError.Forbidden("Not authorized to edit this noticeDivar");

        // Process new mediaEntries if any
        const newAttachments = req.files ? await this.#processContentMedia(
            req.files,
            req.body.fileUploadPath,
            'AUTHOR'
        ) : [];

        // Update noticeDivar with all relations
        const updatedNoticeDivar = await prisma.noticeDivar.update({
            where: { id },
            data: {
                title,
                description,
                content,
                noticeDivarField,
                noticeDivarType,
                slug: title !== existingNoticeDivar.title ? await this.#generateUniqueSlug(title) : undefined,
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
                noticeDivar: updatedNoticeDivar
            }
        });
    } catch (error) {
        next(error);
    }
}

async removeNoticeDivarById(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const noticeDivar = await prisma.noticeDivar.findUnique({
            where: { id }
        });

        if (!noticeDivar) throw createError.NotFound("NoticeDivar not found");
        if (noticeDivar.authorId !== userId) throw createError.Forbidden("Not authorized to delete this noticeDivar");

        await prisma.noticeDivar.delete({
            where: { id }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            message: "NoticeDivar deleted successfully"
        });
    } catch (error) {
        next(error);
    }
}

async getNoticeDivarsByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const noticeDivars = await prisma.noticeDivar.findMany({
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

        const total = await prisma.noticeDivar.count({
            where: {
                authorId: userId
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeDivars,
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

async getLikedNoticeDivarsByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const likes = await prisma.like.findMany({
            where: {
                userId,
                noticeDivarId: {
                    not: null
                }
            },
            skip,
            take: Number(limit),
            include: {
                noticeDivar: {
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
                noticeDivarId: {
                    not: null
                }
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeDivars: likes.map(like => like.noticeDivar),
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

async getBookmarkedNoticeDivarsByUserId(req, res, next) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId,
                noticeDivarId: {
                    not: null
                }
            },
            skip,
            take: Number(limit),
            include: {
                noticeDivar: {
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
                noticeDivarId: {
                    not: null
                }
            }
        });

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                noticeDivars: bookmarks.map(bookmark => bookmark.noticeDivar),
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

async searchNoticeDivars(req, res, next) {
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

        // const [noticeDivars, total] = await prisma.$transaction([
        //     prisma.noticeDivar.findMany({
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
        //     prisma.noticeDivar.count({ where })
        // ]);
        const { q, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const noticeDivars = await prisma.noticeDivar.findMany({
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

        const total = await prisma.noticeDivar.count({
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
                noticeDivars,
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

// RenoticeDivar a noticeDivar
async renoticeDivar(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const { additionalContent } = req.body;
        const userId = req.user.id;

        // Get original noticeDivar
        const originalNoticeDivar = await prisma.noticeDivar.findUnique({
            where: { id: noticeDivarId },
            include: { author: true }
        });

        if (!originalNoticeDivar) throw createError.NotFound("Original noticeDivar not found");

        // Create renoticeDivar record
        const renoticeDivar = await prisma.renoticeDivar.create({
            data: {
                userId,
                noticeDivarId,
                originalNoticeDivarerId: originalNoticeDivar.authorId,
                additionalContent
            }
        });

        // Increment renoticeDivar count on original noticeDivar
        await prisma.noticeDivar.update({
            where: { id: noticeDivarId },
            data: { renoticeDivarCount: { increment: 1 } }
        });

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data: { renoticeDivar }
        });
    } catch (error) {
        next(error);
    }
}

// Bookmark a noticeDivar
async bookmarkNoticeDivar(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const userId = req.user.id;

        const bookmark = await prisma.bookmark.create({
            data: {
                userId,
                noticeDivarId
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

// Like a noticeDivar
async likeNoticeDivar(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const userId = req.user.id;

        // Remove any existing dislike
        await prisma.dislike.deleteMany({
            where: {
                noticeDivarId,
                userId
            }
        });

        const like = await prisma.like.create({
            data: {
                userId,
                noticeDivarId
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

// Dislike a noticeDivar
async dislikeNoticeDivar(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const userId = req.user.id;

        // Remove any existing like
        await prisma.like.deleteMany({
            where: {
                noticeDivarId,
                userId
            }
        });

        const dislike = await prisma.dislike.create({
            data: {
                userId,
                noticeDivarId
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

// Share a noticeDivar
async shareNoticeDivar(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const { platform, customMessage } = req.body;
        const userId = req.user.id;

        const share = await prisma.share.create({
            data: {
                userId,
                noticeDivarId,
                platform,
                customMessage,
                shareUrl: `${process.env.FRONTEND_URL}/noticeDivars/${noticeDivarId}`
            }
        });

        // Increment share count
        await prisma.noticeDivar.update({
            where: { id: noticeDivarId },
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

// Report a noticeDivar
async reportNoticeDivar(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const { reason, description } = req.body;
        const userId = req.user.id;

        const report = await prisma.report.create({
            data: {
                reporterId: userId,
                reportedUserId: noticeDivarId,
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
        const { noticeDivarId } = req.params;
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
                noticeDivarId,
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

// Get noticeDivar comments
async getNoticeDivarComments(req, res, next) {
    try {
        const { noticeDivarId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [comments, total] = await prisma.$transaction([
            prisma.comment.findMany({
                where: {
                    noticeDivarId,
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
                    noticeDivarId,
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
    NoticeDivarForum: new NoticeDivarForum()
}