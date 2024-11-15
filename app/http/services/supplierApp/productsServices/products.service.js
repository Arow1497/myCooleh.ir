const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../utils/functions");
const path = require('path');
const prisma = new PrismaClient();

class ProductService {
    // Private helper methods
    async #generateUniqueSlug(title) {
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
        const existingProduct = await prisma.product.findFirst({
            where: { slug }
        });
        return !!existingProduct;
    }

    async #processContentMedia(files, fileUploadPath, productId) {
        const mediaEntries = [];
        
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

    // Core Product Operations
    async createProduct(productData, files, userId) {
        const mediaEntries = await this.#processContentMedia(
            files,
            productData.fileUploadPath,
            'PROVIDER'
        );

        return prisma.product.create({
            data: {
                title: productData.title,
                description: productData.description,
                price: parseFloat(productData.price),
                discount: productData.discount ? parseFloat(productData.discount) : null,
                inventoryCount: parseInt(productData.inventoryCount),
                minOrderQuantity: productData.minOrderQuantity ? parseInt(productData.minOrderQuantity) : 1,
                maxOrderQuantity: productData.maxOrderQuantity ? parseInt(productData.maxOrderQuantity) : null,
                warranty: productData.warranty,
                warrantyPeriod: productData.warrantyPeriod ? parseInt(productData.warrantyPeriod) : null,
                status: productData.status,
                sellsStatus: productData.sellsStatus,
                city: productData.city,
                regionLatLng: productData.regionLatLng,
                providerId: userId,
                slug: await this.#generateUniqueSlug(productData.title),
                featuredImage: mediaEntries[0]?.url,
                contentMedia: {
                    create: mediaEntries
                },
                categories: {
                    create: productData.categories.map(categoryId => ({
                        category: {
                            connect: { id: categoryId }
                        }
                    }))
                },
                tags: {
                    create: productData.tags.map(tagId => ({
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

    async updateProduct(id, updateData, files, userId) {
        const existingProduct = await prisma.product.findFirst({
            where: { 
                id,
                providerId: userId
            }
        });

        if (!existingProduct) {
            throw createError.NotFound("Product not found or unauthorized");
        }

        let newAttachments = [];
        if (files && Object.keys(files).length > 0) {
            newAttachments = await this.#processContentMedia(
                files,
                updateData.fileUploadPath,
                'PROVIDER'
            );
        }

        return prisma.product.update({
            where: { id },
            data: {
                ...(updateData.title && { 
                    title: updateData.title,
                    slug: await this.#generateUniqueSlug(updateData.title)
                }),
                ...(updateData.description && { description: updateData.description }),
                ...(updateData.price && { price: parseFloat(updateData.price) }),
                ...(updateData.discount !== undefined && { 
                    discount: updateData.discount ? parseFloat(updateData.discount) : null 
                }),
                ...(updateData.inventoryCount && { 
                    inventoryCount: parseInt(updateData.inventoryCount) 
                }),
                ...(updateData.minOrderQuantity && { 
                    minOrderQuantity: parseInt(updateData.minOrderQuantity) 
                }),
                ...(updateData.maxOrderQuantity !== undefined && { 
                    maxOrderQuantity: updateData.maxOrderQuantity ? parseInt(updateData.maxOrderQuantity) : null 
                }),
                ...(updateData.warranty && { warranty: updateData.warranty }),
                ...(updateData.warrantyPeriod !== undefined && { 
                    warrantyPeriod: updateData.warrantyPeriod ? parseInt(updateData.warrantyPeriod) : null 
                }),
                ...(updateData.status && { status: updateData.status }),
                ...(updateData.sellsStatus && { sellsStatus: updateData.sellsStatus }),
                ...(updateData.city && { city: updateData.city }),
                ...(updateData.regionLatLng && { regionLatLng: updateData.regionLatLng }),
                ...(newAttachments.length > 0 && {
                    featuredImage: newAttachments[0].url,
                    contentMedia: {
                        create: newAttachments
                    }
                }),
                ...(updateData.categories && {
                    categories: {
                        deleteMany: {},
                        create: updateData.categories.map(categoryId => ({
                            category: {
                                connect: { id: categoryId }
                            }
                        }))
                    }
                }),
                ...(updateData.tags && {
                    tags: {
                        deleteMany: {},
                        create: updateData.tags.map(tagId => ({
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

module.exports = new ProductService();