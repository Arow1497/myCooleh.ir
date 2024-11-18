const { PrismaClient } = require('@prisma/client');
const createError = require("http-errors");
const {MediaProcessor} = require('../../../generalServices/attachmentProcess');

const prisma = new PrismaClient();
const processor = new MediaProcessor();

class PostService {
   // PRIVATE HELPERS
    /**
     * Generate a unique slug from a given title string.
     * 
     * @param {string} title - The title to be converted to a slug.
     * @returns {string} - The generated unique slug.
     */
    async generateUniqueSlug(title) {
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

    // Core Post Operations
    async createPost(data, userId, files, fileUploadPath) {
        const { title, description, content, postField, postType, categories, tags } = data;
        
        const mediaEntries = await processor.processContentMedia(
            files,
            fileUploadPath,
            'AUTHOR'
        );

        return prisma.post.create({
            data: {
                title,
                description,
                content,
                postField,
                postType,
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
                    include: { category: true }
                },
                tags: {
                    include: { tag: true }
                },
                contentMedia: true
            }
        });
    }

    async getAllPosts(page = 1, limit = 10, sortBy = 'createdAt', order = 'desc') {
        const skip = (page - 1) * limit;

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                skip,
                take: Number(limit),
                orderBy: { [sortBy]: order },
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
            }),
            prisma.post.count()
        ]);

        return {
            posts,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getPostById(id) {
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                author: true,
                categories: {
                    include: { category: true }
                },
                tags: {
                    include: { tag: true }
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

        if (!post) throw createError.NotFound("Post not found");

        await prisma.post.update({
            where: { id },
            data: { viewCount: { increment: 1 } }
        });

        return post;
    }

    async updatePost(id, userId, data, files, fileUploadPath) {
        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) throw createError.NotFound("Post not found");
        if (post.authorId !== userId) throw createError.Forbidden("Not authorized to edit this post");

        const { title, description, content, postField, postType, categories, tags } = data;

        const newAttachments = files ? await processor.processContentMedia(
            files,
            fileUploadPath,
            'AUTHOR'
        ) : [];

        return prisma.post.update({
            where: { id },
            data: {
                title,
                description,
                content,
                postField,
                postType,
                slug: title !== post.title ? await this.generateUniqueSlug(title) : undefined,
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
                    include: { category: true }
                },
                tags: {
                    include: { tag: true }
                },
                contentMedia: true
            }
        });
    }

    async deletePost(id, userId) {
        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) throw createError.NotFound("Post not found");
        if (post.authorId !== userId) throw createError.Forbidden("Not authorized to delete this post");

        await prisma.post.delete({ where: { id } });
        return true;
    }

    async getPostsByUserId(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                where: { authorId: userId },
                skip,
                take: Number(limit),
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
            }),
            prisma.post.count({ where: { authorId: userId } })
        ]);

        return {
            posts,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getTrendingPosts(timeframe = '7d', page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const dateFilter = new Date();

        switch (timeframe) {
            case '24h': dateFilter.setHours(dateFilter.getHours() - 24); break;
            case '30d': dateFilter.setDate(dateFilter.getDate() - 30); break;
            default: dateFilter.setDate(dateFilter.getDate() - 7);
        }

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                where: {
                    createdAt: { gte: dateFilter }
                },
                orderBy: [
                    { viewCount: 'desc' },
                    { shareCount: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: Number(limit),
                include: {
                    author: true,
                    contentMedia: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                            dislikes: true
                        }
                    }
                }
            }),
            prisma.post.count({
                where: {
                    createdAt: { gte: dateFilter }
                }
            })
        ]);

        return {
            posts,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async searchPosts(query, categoryId, tagId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (categoryId) {
            where.categories = {
                some: { categoryId }
            };
        }

        if (tagId) {
            where.tags = {
                some: { tagId }
            };
        }

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    author: true,
                    categories: true,
                    tags: true,
                    contentMedia: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                            dislikes: true
                        }
                    }
                }
            }),
            prisma.post.count({ where })
        ]);

        return {
            posts,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getPostsByTag(tagId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [posts, total] = await prisma.$transaction([
            prisma.post.findMany({
                where: {
                    tags: {
                        some: { tagId }
                    }
                },
                skip,
                take: Number(limit),
                include: {
                    author: true,
                    contentMedia: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                            dislikes: true
                        }
                    }
                }
            }),
            prisma.post.count({
                where: {
                    tags: {
                        some: { tagId }
                    }
                }
            })
        ]);

        return {
            posts,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async updatePostField(id, postField) {
        return prisma.post.update({
            where: { id },
            data: { postField },
            include: {
                contentMedia: true,
                author: true
            }
        });
    }

    async getPostsByCategory(categoryId, page = 1, limit = 10) {
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
                    categories: { 
                        include: { category: true } 
                    },
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

        return {
            posts,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new PostService();