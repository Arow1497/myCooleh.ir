const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class GenericStatisticsService {
    constructor(model, options = {}) {
        this.model = model;
        this.prismaModel = prisma[model];
        this.options = {
            defaultRelations: {},
            countFields: ['comments', 'likes', 'dislikes', 'bookmarks', 'shares'],
            trendingOrderBy: ['viewCount', 'shareCount'],
            ...options
        };
    }

    // دریافت موجودیت‌های پرطرفدار
    async getTrending(queryParams) {
        const { 
            page = 1, 
            limit = 10,
            period = 'week',
            relations = this.options.defaultRelations
        } = queryParams;

        const dateRange = {
            day: 1,
            week: 7,
            month: 30
        };

        if (!dateRange[period]) {
            throw new Error('Invalid period specified');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange[period]);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            this.prismaModel.findMany({
                where: {
                    published: true,
                    createdAt: {
                        gte: startDate
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: this.options.trendingOrderBy.map(field => ({
                    [field]: 'desc'
                })),
                include: {
                    ...relations,
                    _count: {
                        select: this.options.countFields.reduce((acc, field) => ({
                            ...acc,
                            [field]: true
                        }), {})
                    }
                }
            }),
            this.prismaModel.count({
                where: {
                    published: true,
                    createdAt: {
                        gte: startDate
                    }
                }
            })
        ]);

        return this.formatResponse(items, { page, limit, total });
    }

    // دریافت پرفروش‌ترین‌ها یا محبوب‌ترین‌ها
    async getBestSelling(queryParams) {
        const { 
            page = 1, 
            limit = 10,
            period = 'all',
            relations = this.options.defaultRelations
        } = queryParams;

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

        return this.search({
            page,
            limit,
            filters: dateFilter,
            relations,
            sort: 'viewCount',
            order: 'desc'
        });
    }

    // دریافت موارد مشابه
    async getSimilar(itemId, queryParams = {}) {
        const { 
            limit = 10,
            relations = this.options.defaultRelations
        } = queryParams;

        const item = await this.prismaModel.findUnique({
            where: { id: itemId },
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

        if (!item) {
            throw new Error(`${this.model} not found`);
        }

        const categoryIds = item.categories?.map(c => c.categoryId) || [];
        const tagIds = item.tags?.map(t => t.tagId) || [];

        return this.prismaModel.findMany({
            where: {
                id: { not: itemId },
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
            include: relations,
            orderBy: {
                viewCount: 'desc'
            }
        });
    }

    // دریافت موجودیت‌های یک کاربر
    async getByUserId(userId, queryParams) {
        const { 
            page = 1,
            limit = 10,
            relations = this.options.defaultRelations
        } = queryParams;

        return this.search({
            page,
            limit,
            filters: { authorId: userId },
            relations: {
                ...relations,
                _count: {
                    select: this.options.countFields.reduce((acc, field) => ({
                        ...acc,
                        [field]: true
                    }), {})
                }
            }
        });
    }

    // دریافت موجودیت‌های لایک شده توسط کاربر
    async getLikedByUserId(userId, queryParams) {
        const { 
            page = 1,
            limit = 10,
            relations = this.options.defaultRelations
        } = queryParams;

        return this.getRelatedItems('like', userId, {
            page,
            limit,
            relations
        });
    }

    // دریافت موجودیت‌های بوکمارک شده توسط کاربر
    async getBookmarkedByUserId(userId, queryParams) {
        const { 
            page = 1,
            limit = 10,
            relations = this.options.defaultRelations
        } = queryParams;

        return this.getRelatedItems('bookmark', userId, {
            page,
            limit,
            relations
        });
    }

    // متد کمکی برای دریافت آیتم‌های مرتبط (لایک‌ها، بوکمارک‌ها و ...)
    async getRelatedItems(relationType, userId, queryParams) {
        const { page = 1, limit = 10, relations = {} } = queryParams;
        const skip = (page - 1) * limit;

        const modelIdField = `${this.model}Id`;

        const [items, total] = await Promise.all([
            prisma[relationType].findMany({
                where: {
                    userId,
                    [modelIdField]: {
                        not: null
                    }
                },
                skip,
                take: Number(limit),
                include: {
                    [this.model]: {
                        include: {
                            ...relations,
                            _count: {
                                select: this.options.countFields.reduce((acc, field) => ({
                                    ...acc,
                                    [field]: true
                                }), {})
                            }
                        }
                    }
                }
            }),
            prisma[relationType].count({
                where: {
                    userId,
                    [modelIdField]: {
                        not: null
                    }
                }
            })
        ]);

        const formattedItems = items.map(item => item[this.model]);
        return this.formatResponse(formattedItems, { page, limit, total });
    }

    // متد کمکی برای جستجوی پایه
    async search(queryParams) {
        const {
            page = 1,
            limit = 10,
            filters = {},
            relations = this.options.defaultRelations,
            sort = 'createdAt',
            order = 'desc'
        } = queryParams;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            this.prismaModel.findMany({
                where: {
                    published: true,
                    ...filters
                },
                skip,
                take: parseInt(limit),
                orderBy: {
                    [sort]: order
                },
                include: relations
            }),
            this.prismaModel.count({
                where: {
                    published: true,
                    ...filters
                }
            })
        ]);

        return this.formatResponse(items, { page, limit, total });
    }

    // فرمت‌دهی پاسخ
    formatResponse(items, pagination) {
        return {
            items,
            pagination: {
                page: Number(pagination.page),
                limit: Number(pagination.limit),
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.limit)
            }
        };
    }
}

// کلاس‌های تخصصی برای هر موجودیت
class ProductStatisticsService extends GenericStatisticsService {
    constructor() {
        super('product', {
            defaultRelations: {
                author: true,
                provider: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                contentMedia: true
            },
            trendingOrderBy: ['viewCount', 'shareCount', 'orderCount']
        });
    }

    // متدهای اختصاصی محصولات
    async getTopSellingProducts(period = 'month') {
        // پیاده‌سازی اختصاصی برای محصولات پرفروش
    }
}

class PostStatisticsService extends GenericStatisticsService {
    constructor() {
        super('post', {
            defaultRelations: {
                author: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                tags: true
            },
            trendingOrderBy: ['viewCount', 'commentCount']
        });
    }

    // متدهای اختصاصی پست‌ها
    async getMostCommentedPosts(period = 'week') {
        // پیاده‌سازی اختصاصی برای پست‌های پربحث
    }
}

class AdStatisticsService extends GenericStatisticsService {
    constructor() {
        super('ad', {
            defaultRelations: {
                user: true,
                category: true,
                images: true
            },
            trendingOrderBy: ['viewCount', 'contactCount']
        });
    }

    // متدهای اختصاصی آگهی‌ها
    async getMostContactedAds(period = 'week') {
        // پیاده‌سازی اختصاصی برای آگهی‌های پرتماس
    }
}

// ایجاد نمونه‌های سرویس
const productStats = new ProductStatisticsService();
const postStats = new PostStatisticsService();
const adStats = new AdStatisticsService();

module.exports = {
    GenericStatisticsService,
    ProductStatisticsService,
    PostStatisticsService,
    AdStatisticsService,
    productStats,
    postStats,
    adStats
};

/*
نحوه استفاده:
دریافت محصولات پرطرفدار
const trendingProducts = await productStats.getTrending({
    period: 'week',
    page: 1,
    limit: 10
});

دریافت پست‌های مشابه
const similarPosts = await postStats.getSimilar(postId, {
    limit: 5
});

دریافت آگهی‌های بوکمارک شده کاربر
const bookmarkedAds = await adStats.getBookmarkedByUserId(userId, {
    page: 1,
    limit: 20
});

////////////////////////////////////////////////////////////////////////////////


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
    
        بررسی صحت مقدار period
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

*/