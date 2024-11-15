const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../utils/functions");
const path = require('path');
const prisma = new PrismaClient();

class CreateProductDTO {
    constructor(data) {
      this.title = data.title;
      this.description = data.description;
      this.price = data.price;
      this.discount = data.discount;
      this.inventoryCount = data.inventoryCount;
      this.minOrderQuantity = data.minOrderQuantity;
      this.maxOrderQuantity = data.maxOrderQuantity;
      this.warranty = data.warranty;
      this.warrantyPeriod = data.warrantyPeriod;
      this.status = data.status;
      this.sellsStatus = data.sellsStatus;
      this.city = data.city;
      this.regionLatLng = data.regionLatLng;
      this.categories = data.categories;
      this.tags = data.tags;
      this.files = data.files;
      this.fileUploadPath = data.fileUploadPath;
    }
  }
  class UpdateProductDTO {
    constructor(data) {
      // فقط فیلدهایی که در بادی ریکوئست وجود دارند را می‌گیریم
      if (data.title) this.title = data.title;
      if (data.description) this.description = data.description;
      if (data.price) this.price = data.price;
      if (data.discount !== undefined) this.discount = data.discount;
      if (data.inventoryCount) this.inventoryCount = data.inventoryCount;
      if (data.minOrderQuantity) this.minOrderQuantity = data.minOrderQuantity;
      if (data.maxOrderQuantity !== undefined) this.maxOrderQuantity = data.maxOrderQuantity;
      if (data.warranty) this.warranty = data.warranty;
      if (data.warrantyPeriod !== undefined) this.warrantyPeriod = data.warrantyPeriod;
      if (data.status) this.status = data.status;
      if (data.sellsStatus) this.sellsStatus = data.sellsStatus;
      if (data.city) this.city = data.city;
      if (data.regionLatLng) this.regionLatLng = data.regionLatLng;
      if (data.categories) this.categories = data.categories;
      if (data.tags) this.tags = data.tags;
      if (data.files) this.files = data.files;
      if (data.fileUploadPath) this.fileUploadPath = data.fileUploadPath;
    }
  }
class ProductService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // Private helper methods
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
        const existingProduct = await prisma.product.findFirst({
            where: { slug }
        });
        return !!existingProduct;
    }
    // متد جدید برای چک کردن مالکیت محصول
    async #checkProductOwnership(productId, providerId) {
        const product = await this.prisma.product.findFirst({
        where: { 
            id: productId,
            providerId
        }
        });

        if (!product) {
        throw new Error("Product not found or unauthorized");
        }

        return product;
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
                dimensions: { width: 0, height: 0 },
                status: 'COMPLETED',
                productId
            });
        }

        // Process audio files
        if (files?.audio?.length > 0) {
            const audioFile = files.audio[0];
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
        if (files?.video?.length > 0) {
            const videoFile = files.video[0];
            const videoAddress = path.join(fileUploadPath, videoFile.filename).replace(/\\/g, "/");
            const videoURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`;

            try {
                const seconds = await getVideoDurationInSeconds(videoURL);
                mediaEntries.push({
                    url: videoAddress,
                    filename: videoFile.filename,
                    type: 'VIDEO',
                    fileSize: videoFile.size.toString(),
                    mimeType: videoFile.mimetype,
                    duration: getTime(seconds),
                    status: 'COMPLETED',
                    productId
                });
            } catch (error) {
                console.error("Error calculating video duration:", error);
            }
        }

        return mediaEntries;
    }
////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Core Product Operations
    async createProduct(dto, providerId) {
        const mediaEntries = await this.#processContentMedia(
            dto.files,
            dto.fileUploadPath,
            'PROVIDER'
        );

        return prisma.product.create({
            data: {
                title: dto.title,
                description: dto.description,
                price: parseFloat(dto.price),
                discount: dto.discount ? parseFloat(dto.discount) : null,
                inventoryCount: parseInt(dto.inventoryCount),
                minOrderQuantity: dto.minOrderQuantity ? parseInt(dto.minOrderQuantity) : 1,
                maxOrderQuantity: dto.maxOrderQuantity ? parseInt(dto.maxOrderQuantity) : null,
                warranty: dto.warranty,
                warrantyPeriod: dto.warrantyPeriod ? parseInt(dto.warrantyPeriod) : null,
                status: dto.status,
                sellsStatus: dto.sellsStatus,
                city: dto.city,
                regionLatLng: dto.regionLatLng,
                providerId: userId,
                slug: await this.#generateUniqueSlug(dto.title),
                featuredImage: mediaEntries[0]?.url,
                contentMedia: {
                    create: mediaEntries
                },
                categories: {
                    create: dto.categories.map(categoryId => ({
                        category: {
                            connect: { id: categoryId }
                        }
                    }))
                },
                tags: {
                    create: dto.tags.map(tagId => ({
                        tag: {
                            connect: { id: tagId }
                        }
                    }))
                }
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
        });
    }

    async updateProduct(productId, dto, providerId) {
        // چک کردن مالکیت محصول
      await this.#checkProductOwnership(productId, providerId);

        let newAttachments = [];
        if (dto.files && Object.keys(dto.files).length > 0) {
            newAttachments = await this.#processContentMedia(
                dto.files,
                dto.fileUploadPath,
                'PROVIDER'
            );
        }

        return prisma.product.update({
            where: { id: productId },
            data: {
                ...(dto.title && { 
                    title: dto.title,
                    slug: await this.#generateUniqueSlug(dto.title)
                }),
                ...(dto.description && { description: dto.description }),
                ...(dto.price && { price: parseFloat(dto.price) }),
                ...(dto.discount !== undefined && { 
                    discount: dto.discount ? parseFloat(dto.discount) : null 
                }),
                ...(dto.inventoryCount && { 
                    inventoryCount: parseInt(dto.inventoryCount) 
                }),
                ...(dto.minOrderQuantity && { 
                    minOrderQuantity: parseInt(dto.minOrderQuantity) 
                }),
                ...(dto.maxOrderQuantity !== undefined && { 
                    maxOrderQuantity: dto.maxOrderQuantity ? parseInt(dto.maxOrderQuantity) : null 
                }),
                ...(dto.warranty && { warranty: dto.warranty }),
                ...(dto.warrantyPeriod !== undefined && { 
                    warrantyPeriod: dto.warrantyPeriod ? parseInt(dto.warrantyPeriod) : null 
                }),
                ...(dto.status && { status: dto.status }),
                ...(dto.sellsStatus && { sellsStatus: dto.sellsStatus }),
                ...(dto.city && { city: dto.city }),
                ...(dto.regionLatLng && { regionLatLng: dto.regionLatLng }),
                ...(newAttachments.length > 0 && {
                    featuredImage: newAttachments[0].url,
                    contentMedia: {
                        create: newAttachments
                    }
                }),
                ...(dto.categories && {
                    categories: {
                        deleteMany: {},
                        create: dto.categories.map(categoryId => ({
                            category: {
                                connect: { id: categoryId }
                            }
                        }))
                    }
                }),
                ...(dto.tags && {
                    tags: {
                        deleteMany: {},
                        create: dto.tags.map(tagId => ({
                            tag: {
                                connect: { id: tagId }
                            }
                        }))
                    }
                })
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
        });
    }

    async deleteProduct(id, userId) {
        const existingProduct = await prisma.product.findFirst({
            where: { 
                id,
                providerId: userId
            }
        });

        if (!existingProduct) {
            throw createError.NotFound("Product not found or unauthorized");
        }

        await prisma.product.delete({
            where: { id }
        });
    }

    async getProduct(id) {
        const product = await prisma.product.findUnique({
            where: { id },
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
        });

        if (!product) {
            throw createError.NotFound("Product not found");
        }

        await prisma.product.update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });

        return product;
    }

    async getProducts(queryParams) {
        const { 
            page = 1, 
            limit = 10, 
            sort = 'createdAt',
            order = 'desc',
            search,
            category,
            minPrice,
            maxPrice,
            city,
            status,
            sellsStatus
        } = queryParams;

        const skip = (page - 1) * limit;

        const where = {
            published: true,
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ]
            }),
            ...(category && {
                categories: {
                    some: {
                        categoryId: category
                    }
                }
            }),
            ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
            ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
            ...(city && { city }),
            ...(status && { status }),
            ...(sellsStatus && { sellsStatus })
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

    async togglePublishStatus(id, userId) {
        const product = await prisma.product.findFirst({
            where: {
                id,
                providerId: userId
            }
        });

        if (!product) {
            throw createError.NotFound("Product not found or unauthorized");
        }

        return prisma.product.update({
            where: { id },
            data: {
                published: !product.published
            }
        });
    }

    async getProductStats(id, userId) {
        const product = await prisma.product.findFirst({
            where: {
                id,
                providerId: userId
            },
            include: {
                _count: {
                    select: {
                        bookmarks: true,
                        shares: true
                    }
                }
            }
        });

        if (!product) {
            throw createError.NotFound("Product not found or unauthorized");
        }

        return {
            viewCount: product.viewCount,
            bookmarkCount: product._count.bookmarks,
            shareCount: product._count.shares,
            createdAt: product.createdAt,
            lastUpdated: product.updatedAt,
            published: product.published
        };
    }

    async bulkUpdateProducts(productIds, updates, userId) {
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                providerId: userId
            }
        });

        if (products.length !== productIds.length) {
            throw createError.Forbidden("Unauthorized access to one or more products");
        }

        await prisma.product.updateMany({
            where: {
                id: { in: productIds }
            },
            data: {
                ...updates,
                updatedAt: new Date()
            }
        });

        return products.length;
    }

    async getProviderProducts(queryParams, userId) {
        const { 
            page = 1, 
            limit = 10,
            status,
            published 
        } = queryParams;

        const skip = (page - 1) * limit;

        const where = {
            providerId: userId,
            ...(status && { status }),
            ...(published !== undefined && { published: Boolean(published) })
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    categories: {
                        include: {
                            category: true
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

    async shareProduct(productId, userId, shareData) {
        const share = await prisma.share.create({
            data: {
                userId,
                productId,
                platform: shareData.platform,
                customMessage: shareData.customMessage,
                shareUrl: `${process.env.FRONTEND_URL}/products/${productId}`
            }
        });

        await prisma.product.update({
            where: { id: productId },
            data: { shareCount: { increment: 1 } }
        });

        return share;
    }

    async toggleBookmark(userId, productId) {
        const existingBookmark = await prisma.bookmark.findFirst({
            where: {
                userId,
                productId
            }
        });

        if (existingBookmark) {
            // حذف بوکمارک
            await prisma.bookmark.delete({
                where: {
                    id: existingBookmark.id
                }
            });
            return { message: "Bookmark removed successfully" };
        }

        // افزودن بوکمارک
        await prisma.bookmark.create({
            data: {
                userId,
                productId
            }
        });
        return { message: "Product bookmarked successfully" };
    }

    async getBookmarkedProducts(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [bookmarks, total] = await Promise.all([
            prisma.bookmark.findMany({
                where: {
                    userId
                },
                skip,
                take: parseInt(limit),
                include: {
                    product: {
                        include: {
                            provider: true,
                            contentMedia: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.bookmark.count({
                where: {
                    userId
                }
            })
        ]);

        return {
            bookmarks: bookmarks.map(b => b.product),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = {
    productService: new ProductService(),
    CreateProductDTO,
    UpdateProductDTO
};