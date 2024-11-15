const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class StatisticsService {
    async getTrendingProducts(queryParams) {
        const { 
            page = 1, 
            limit = 10,
            period = 'week'
        } = queryParams;
    
        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
    
        const skip = (pageInt - 1) * limitInt;
    
        const dateRange = {
            day: 1,
            week: 7,
            month: 30
        };
    
        // بررسی صحت مقدار period
        if (!dateRange[period]) {
            throw new Error('Invalid period specified');
        }
    
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange[period]);
    
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: {
                    published: true,
                    createdAt: {
                        gte: startDate
                    }
                },
                skip,
                take: limitInt,
                orderBy: [
                    { viewCount: 'desc' },
                    { shareCount: 'desc' }
                ],
                include: {
                    provider: true,
                    contentMedia: true,
                    _count: {
                        select: {
                            bookmarks: true
                        }
                    }
                }
            }),
            prisma.product.count({
                where: {
                    published: true,
                    createdAt: {
                        gte: startDate
                    }
                }
            })
        ]);
    
        return {
            products: products.map(product => ({
                ...product,
                bookmarkCount: product._count.bookmarks
            })),
            pagination: {
                page: pageInt,
                limit: limitInt,
                total,
                totalPages: Math.ceil(total / limitInt)
            }
        };
    }

    async getBestSellingProducts(queryParams) {
        const { 
            page = 1, 
            limit = 10,
            period = 'all'
        } = queryParams;

        const skip = (page - 1) * limit;

        let dateFilter = {};
        if (period !== 'all') {
            const periodMap = {
                week: 7,
                month: 30,
                year: 365
            };

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - periodMap[period]);
            
            dateFilter = {
                createdAt: {
                    gte: startDate
                }
            };
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: {
                    published: true,
                    ...dateFilter
                },
                skip,
                take: parseInt(limit),
                orderBy: {
                    viewCount: 'desc'
                },
                include: {
                    provider: true,
                    contentMedia: true,
                    categories: {
                        include: {
                            category: true
                        }
                    }
                }
            }),
            prisma.product.count({
                where: {
                    published: true,
                    ...dateFilter
                }
            })
        ]);

        return {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getSimilarProducts(productId, limit = 10) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                categories: {
                    include: {
                        category: true
                    }
                },
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        });

        if (!product) {
            throw new Error("Product not found");
        }

        const categoryIds = product.categories.map(c => c.categoryId);
        const tagIds = product.tags.map(t => t.tagId);

        return prisma.product.findMany({
            where: {
                id: { not: productId },
                published: true,
                OR: [
                    {
                        categories: {
                            some: {
                                categoryId: {
                                    in: categoryIds
                                }
                            }
                        }
                    },
                    {
                        tags: {
                            some: {
                                tagId: {
                                    in: tagIds
                                }
                            }
                        }
                    }
                ]
            },
            take: parseInt(limit),
            include: {
                provider: true,
                contentMedia: true,
                categories: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: {
                viewCount: 'desc'
            }
        });
    }

    async getProductsByUserId(userId, queryParams) {
        const { page = 1, limit = 10 } = queryParams;
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prisma.product.findMany({
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
            }),
            prisma.product.count({
                where: {
                    authorId: userId
                }
            })
        ]);

        return {
            products,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getLikedProductsByUserId(userId, queryParams) {
        const { page = 1, limit = 10 } = queryParams;
        const skip = (page - 1) * limit;

        const [likes, total] = await Promise.all([
            prisma.like.findMany({
                where: {
                    userId,
                    productId: {
                        not: null
                    }
                },
                skip,
                take: Number(limit),
                include: {
                    product: {
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
            }),
            prisma.like.count({
                where: {
                    userId,
                    productId: {
                        not: null
                    }
                }
            })
        ]);

        return {
            products: likes.map(like => like.product),
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getBookmarkedProductsByUserId(userId, queryParams) {
        const { page = 1, limit = 10 } = queryParams;
        const skip = (page - 1) * limit;

        const [bookmarks, total] = await Promise.all([
            prisma.bookmark.findMany({
                where: {
                    userId,
                    productId: {
                        not: null
                    }
                },
                skip,
                take: Number(limit),
                include: {
                    product: {
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
            }),
            prisma.bookmark.count({
                where: {
                    userId,
                    productId: {
                        not: null
                    }
                }
            })
        ]);

        return {
            products: bookmarks.map(bookmark => bookmark.product),
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new StatisticsService();