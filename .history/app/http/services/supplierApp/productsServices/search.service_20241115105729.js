const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SearchService {
    async searchByText(queryParams) {
        const { 
            query, 
            page = 1, 
            limit = 10,
            searchFields = ['title', 'description'] 
        } = queryParams;

        const skip = (page - 1) * limit;

        const searchConditions = searchFields.map(field => ({
            [field]: {
                contains: query,
                mode: 'insensitive'
            }
        }));

        const where = {
            published: true,
            OR: searchConditions
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
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
                    _relevance: {
                        fields: searchFields,
                        search: query,
                        sort: 'desc'
                    }
                }
            }),
            prisma.product.count({ where })
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

    async searchByCategory(queryParams) {
        const { 
            categoryId, 
            page = 1, 
            limit = 10,
            sort = 'createdAt',
            order = 'desc'
        } = queryParams;

        const skip = (page - 1) * limit;

        const where = {
            published: true,
            categories: {
                some: {
                    categoryId
                }
            }
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
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
                    [sort]: order
                }
            }),
            prisma.product.count({ where })
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

    async searchByTags(queryParams) {
        const { 
            tags, 
            page = 1, 
            limit = 10,
            matchAll = false 
        } = queryParams;

        const skip = (page - 1) * limit;
        const tagArray = Array.isArray(tags) ? tags : [tags];

        const where = {
            published: true,
            tags: matchAll 
                ? {
                    every: {
                        tagId: { in: tagArray }
                    }
                }
                : {
                    some: {
                        tagId: { in: tagArray }
                    }
                }
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    provider: true,
                    contentMedia: true,
                    tags: {
                        include: {
                            tag: true
                        }
                    }
                }
            }),
            prisma.product.count({ where })
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

    async searchProducts(queryParams) {
        const {
            page = 1,
            limit = 10,
            search,
            categories = [],
            tags = [],
            priceRange,
            warranty,
            city,
            sort = 'createdAt',
            order = 'desc'
        } = queryParams;

        const skip = (page - 1) * limit;

        const where = {
            published: true,
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { tags: { 
                        some: { 
                            tag: { 
                                name: { contains: search, mode: 'insensitive' } 
                            } 
                        } 
                    }}
                ]
            }),
            ...(categories.length > 0 && {
                categories: {
                    some: {
                        categoryId: { in: categories }
                    }
                }
            }),
            ...(tags.length > 0 && {
                tags: {
                    some: {
                        tagId: { in: tags }
                    }
                }
            }),
            ...(priceRange && {
                AND: [
                    { price: { gte: priceRange.min } },
                    { price: { lte: priceRange.max } }
                ]
            }),
            ...(warranty && { warranty }),
            ...(city && { city })
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: {
                    [sort]: order
                },
                include: {
                    provider: true,
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
            }),
            prisma.product.count({ where })
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
}

module.exports = new SearchService();