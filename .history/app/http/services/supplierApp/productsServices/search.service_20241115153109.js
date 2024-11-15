const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class GenericSearchService {
    constructor(model, options = {}) {
        this.model = model;
        this.prismaModel = prisma[model];
        // گزینه‌های پیش‌فرض برای هر موجودیت
        this.options = {
            searchFields: ['title', 'description'],
            defaultRelations: {},
            defaultSort: 'createdAt',
            ...options
        };
    }

    // متد پایه برای جستجو
    async search(queryParams) {
        const {
            page = 1,
            limit = 10,
            search,
            searchFields = this.options.searchFields,
            filters = {},
            relations = this.options.defaultRelations,
            sort = this.options.defaultSort,
            order = 'desc'
        } = queryParams;

        const skip = (page - 1) * limit;

        const searchConditions = search ? searchFields.map(field => ({
            [field]: {
                contains: search,
                mode: 'insensitive'
            }
        })) : [];

        const baseWhere = {
            published: true,
            ...(search && { OR: searchConditions }),
            ...this.buildFilters(filters)
        };

        const [items, total] = await Promise.all([
            this.prismaModel.findMany({
                where: baseWhere,
                skip,
                take: parseInt(limit),
                orderBy: {
                    [sort]: order
                },
                include: relations
            }),
            this.prismaModel.count({ where: baseWhere })
        ]);

        return this.formatResponse(items, { page, limit, total });
    }

    // جستجو بر اساس دسته‌بندی
    async searchByCategory(queryParams) {
        const {
            categoryId,
            page = 1,
            limit = 10,
            sort = this.options.defaultSort,
            order = 'desc',
            relations = this.options.defaultRelations
        } = queryParams;

        return this.search({
            page,
            limit,
            filters: {
                categories: Array.isArray(categoryId) ? categoryId : [categoryId]
            },
            sort,
            order,
            relations
        });
    }

    // جستجو بر اساس تگ‌ها
    async searchByTags(queryParams) {
        const {
            tags,
            matchAll = false,
            page = 1,
            limit = 10,
            relations = this.options.defaultRelations
        } = queryParams;

        const tagFilters = {
            tags: matchAll
                ? {
                    every: {
                        tagId: { in: Array.isArray(tags) ? tags : [tags] }
                    }
                }
                : {
                    some: {
                        tagId: { in: Array.isArray(tags) ? tags : [tags] }
                    }
                }
        };

        return this.search({
            page,
            limit,
            filters: tagFilters,
            relations
        });
    }

    // جستجوی پیشرفته
    async advancedSearch(queryParams) {
        const {
            search,
            categories = [],
            tags = [],
            priceRange,
            customFilters = {},
            page = 1,
            limit = 10,
            sort = this.options.defaultSort,
            order = 'desc',
            relations = this.options.defaultRelations
        } = queryParams;

        const filters = {
            ...customFilters,
            ...(categories.length > 0 && { categories: categories }),
            ...(tags.length > 0 && { tags: tags }),
            ...(priceRange && { price: priceRange })
        };

        return this.search({
            search,
            page,
            limit,
            filters,
            sort,
            order,
            relations
        });
    }

    // ساخت فیلترها
    buildFilters(filters) {
        const prismaFilters = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                // برای آرایه‌ها (مثل دسته‌بندی‌ها یا تگ‌ها)
                if (value.length > 0) {
                    prismaFilters[key] = {
                        some: {
                            [`${key.slice(0, -1)}Id`]: { in: value }
                        }
                    };
                }
            } else if (typeof value === 'object' && value !== null) {
                if ('min' in value || 'max' in value) {
                    // برای محدوده‌های عددی
                    prismaFilters[key] = {
                        ...(value.min !== undefined && { gte: value.min }),
                        ...(value.max !== undefined && { lte: value.max })
                    };
                } else if ('every' in value || 'some' in value) {
                    // برای روابط پیچیده
                    prismaFilters[key] = value;
                } else {
                    prismaFilters[key] = value;
                }
            } else if (value !== undefined && value !== null) {
                prismaFilters[key] = value;
            }
        });

        return prismaFilters;
    }

    // فرمت‌دهی پاسخ
    formatResponse(items, pagination) {
        return {
            items,
            pagination: {
                page: parseInt(pagination.page),
                limit: parseInt(pagination.limit),
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.limit)
            }
        };
    }
}

// تعریف سرویس‌های تخصصی برای هر موجودیت
class ProductSearchService extends GenericSearchService {
    constructor() {
        super('product', {
            searchFields: ['title', 'description', 'sku'],
            defaultRelations: {
                provider: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                contentMedia: true
            }
        });
    }

    // متدهای اختصاصی محصولات
    async searchByPrice(minPrice, maxPrice, options = {}) {
        return this.search({
            ...options,
            filters: {
                ...options.filters,
                price: { min: minPrice, max: maxPrice }
            }
        });
    }
}

class PostSearchService extends GenericSearchService {
    constructor() {
        super('post', {
            searchFields: ['title', 'content', 'excerpt'],
            defaultRelations: {
                author: true,
                categories: true,
                tags: true
            }
        });
    }

    // متدهای اختصاصی پست‌ها
    async searchByAuthor(authorId, options = {}) {
        return this.search({
            ...options,
            filters: {
                ...options.filters,
                authorId
            }
        });
    }
}

class AdSearchService extends GenericSearchService {
    constructor() {
        super('ad', {
            searchFields: ['title', 'description', 'location'],
            defaultRelations: {
                user: true,
                category: true,
                images: true
            }
        });
    }

    // متدهای اختصاصی آگهی‌ها
    async searchByLocation(location, options = {}) {
        return this.search({
            ...options,
            filters: {
                ...options.filters,
                location
            }
        });
    }
}

// ایجاد نمونه‌های سرویس
const productSearch = new ProductSearchService();
const postSearch = new PostSearchService();
const adSearch = new AdSearchService();

module.exports = {
    GenericSearchService,
    ProductSearchService,
    PostSearchService,
    AdSearchService,
    productSearch,
    postSearch,
    adSearch
};

// مزایای این رویکرد:

// انعطاف‌پذیری: می‌توانید برای هر نوع موجودیت از یک نمونه سرویس جستجو استفاده کنید.
// کاهش تکرار کد: منطق اصلی جستجو فقط یک‌بار نوشته شده است.
// قابلیت توسعه: به راحتی می‌توانید ویژگی‌های جدید را برای همه موجودیت‌ها اضافه کنید.

// نحوه استفاده
// برای جستجوی محصولات
// const productResults = await productSearchService.search({
//     search: "موبایل",
//     searchFields: ['title', 'description'],
//     filters: {
//         categories: [1, 2, 3],
//         priceRange: { min: 1000000, max: 5000000 },
//         city: "تهران"
//     },
//     relations: {
//         provider: true,
//         categories: {
//             include: {
//                 category: true
//             }
//         }
//     }
// });

// برای جستجوی پست‌ها
// const postResults = await postSearchService.search({
//     search: "آموزش",
//     filters: {
//         tags: [1, 2],
//         status: "published"
//     },
//     relations: {
//         author: true,
//         tags: true
//     }
// });

// برای اضافه کردن قابلیت‌های خاص برای هر موجودیت، می‌توانید کلاس‌های مخصوص را از 
// GenericSearchService ارث‌بری کنید:
// class ProductSearchService extends GenericSearchService {
//     constructor() {
//         super('product');
//     }

//     // اضافه کردن متدهای خاص محصولات
//     async searchByCategory(categoryId) {
//         return this.search({
//             filters: {
//                 categories: [categoryId]
//             }
//         });
//     }
// }




//////////////////////////////////////////////////////////////////////////////






// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// class SearchService {
//     async searchByText(queryParams) {
//         const { 
//             query, 
//             page = 1, 
//             limit = 10,
//             searchFields = ['title', 'description'] 
//         } = queryParams;

//         const skip = (page - 1) * limit;

//         const searchConditions = searchFields.map(field => ({
//             [field]: {
//                 contains: query,
//                 mode: 'insensitive'
//             }
//         }));

//         const where = {
//             published: true,
//             OR: searchConditions
//         };

//         const [products, total] = await Promise.all([
//             prisma.product.findMany({
//                 where,
//                 skip,
//                 take: parseInt(limit),
//                 include: {
//                     provider: true,
//                     contentMedia: true,
//                     categories: {
//                         include: {
//                             category: true
//                         }
//                     }
//                 },
//                 orderBy: {
//                     _relevance: {
//                         fields: searchFields,
//                         search: query,
//                         sort: 'desc'
//                     }
//                 }
//             }),
//             prisma.product.count({ where })
//         ]);

//         return {
//             products,
//             pagination: {
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 total,
//                 totalPages: Math.ceil(total / limit)
//             }
//         };
//     }

//     async searchByCategory(queryParams) {
//         const { 
//             categoryId, 
//             page = 1, 
//             limit = 10,
//             sort = 'createdAt',
//             order = 'desc'
//         } = queryParams;

//         const skip = (page - 1) * limit;

//         const where = {
//             published: true,
//             categories: {
//                 some: {
//                     categoryId
//                 }
//             }
//         };

//         const [products, total] = await Promise.all([
//             prisma.product.findMany({
//                 where,
//                 skip,
//                 take: parseInt(limit),
//                 include: {
//                     provider: true,
//                     contentMedia: true,
//                     categories: {
//                         include: {
//                             category: true
//                         }
//                     }
//                 },
//                 orderBy: {
//                     [sort]: order
//                 }
//             }),
//             prisma.product.count({ where })
//         ]);

//         return {
//             products,
//             pagination: {
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 total,
//                 totalPages: Math.ceil(total / limit)
//             }
//         };
//     }

//     async searchByTags(queryParams) {
//         const { 
//             tags, 
//             page = 1, 
//             limit = 10,
//             matchAll = false 
//         } = queryParams;

//         const skip = (page - 1) * limit;
//         const tagArray = Array.isArray(tags) ? tags : [tags];

//         const where = {
//             published: true,
//             tags: matchAll 
//                 ? {
//                     every: {
//                         tagId: { in: tagArray }
//                     }
//                 }
//                 : {
//                     some: {
//                         tagId: { in: tagArray }
//                     }
//                 }
//         };

//         const [products, total] = await Promise.all([
//             prisma.product.findMany({
//                 where,
//                 skip,
//                 take: parseInt(limit),
//                 include: {
//                     provider: true,
//                     contentMedia: true,
//                     tags: {
//                         include: {
//                             tag: true
//                         }
//                     }
//                 }
//             }),
//             prisma.product.count({ where })
//         ]);

//         return {
//             products,
//             pagination: {
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 total,
//                 totalPages: Math.ceil(total / limit)
//             }
//         };
//     }

//     async searchProducts(queryParams) {
//         const {
//             page = 1,
//             limit = 10,
//             search,
//             categories = [],
//             tags = [],
//             priceRange,
//             warranty,
//             city,
//             sort = 'createdAt',
//             order = 'desc'
//         } = queryParams;

//         const skip = (page - 1) * limit;

//         const where = {
//             published: true,
//             ...(search && {
//                 OR: [
//                     { title: { contains: search, mode: 'insensitive' } },
//                     { description: { contains: search, mode: 'insensitive' } },
//                     { tags: { 
//                         some: { 
//                             tag: { 
//                                 name: { contains: search, mode: 'insensitive' } 
//                             } 
//                         } 
//                     }}
//                 ]
//             }),
//             ...(categories.length > 0 && {
//                 categories: {
//                     some: {
//                         categoryId: { in: categories }
//                     }
//                 }
//             }),
//             ...(tags.length > 0 && {
//                 tags: {
//                     some: {
//                         tagId: { in: tags }
//                     }
//                 }
//             }),
//             ...(priceRange && {
//                 AND: [
//                     { price: { gte: priceRange.min } },
//                     { price: { lte: priceRange.max } }
//                 ]
//             }),
//             ...(warranty && { warranty }),
//             ...(city && { city })
//         };

//         const [products, total] = await Promise.all([
//             prisma.product.findMany({
//                 where,
//                 skip,
//                 take: parseInt(limit),
//                 orderBy: {
//                     [sort]: order
//                 },
//                 include: {
//                     provider: true,
//                     categories: {
//                         include: {
//                             category: true
//                         }
//                     },
//                     tags: {
//                         include: {
//                             tag: true
//                         }
//                     },
//                     contentMedia: true
//                 }
//             }),
//             prisma.product.count({ where })
//         ]);

//         return {
//             products,
//             pagination: {
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 total,
//                 totalPages: Math.ceil(total / limit)
//             }
//         };
//     }
// }

// module.exports = new SearchService();