const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../../utils/functions");

class ProductShop extends Controller{

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
    // Product Management Methods
    async createProduct(req, res, next) {
        try {
            const { 
                title, description, price, discount, inventoryCount,
                minOrderQuantity, maxOrderQuantity, warranty, warrantyPeriod,
                status, sellsStatus, city, regionLatLng, categories, tags 
            } = req.body;
            const providerId = req.user.id;

            const mediaEntries = await this.#processContentMedia(
                req.files,
                req.body.fileUploadPath,
                'PROVIDER'
            );

            const product = await prisma.product.create({
                data: {
                    title,
                    description,
                    price: parseFloat(price),
                    discount: discount ? parseFloat(discount) : null,
                    inventoryCount: parseInt(inventoryCount),
                    minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : 1,
                    maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : null,
                    warranty,
                    warrantyPeriod: warrantyPeriod ? parseInt(warrantyPeriod) : null,
                    status,
                    sellsStatus,
                    city,
                    regionLatLng,
                    providerId,
                    slug: await this.#generateUniqueSlug(title),
                    featuredImage: mediaEntries[0]?.url,
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

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { product }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProduct(req, res, next) {
        try {
            const { id } = req.params;
            const providerId = req.user.id;
            const updateData = req.body;

            // Check if product exists and belongs to provider
            const existingProduct = await prisma.product.findFirst({
                where: { 
                    id,
                    providerId
                }
            });

            if (!existingProduct) {
                throw createError.NotFound("Product not found or unauthorized");
            }

            // Process new mediaEntries if any
            let newAttachments = [];
            if (req.files && Object.keys(req.files).length > 0) {
                newAttachments = await this.#processContentMedia(
                    req.files,
                    req.body.fileUploadPath,
                    'PROVIDER'
                );
            }

            // Update product
            const updatedProduct = await prisma.product.update({
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { product: updatedProduct }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteProduct(req, res, next) {
        try {
            const { id } = req.params;
            const providerId = req.user.id;

            // Check if product exists and belongs to provider
            const existingProduct = await prisma.product.findFirst({
                where: { 
                    id,
                    providerId
                }
            });

            if (!existingProduct) {
                throw createError.NotFound("Product not found or unauthorized");
            }

            // Delete product and all related data
            await prisma.product.delete({
                where: { id }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Product deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async getProduct(req, res, next) {
        try {
            const { id } = req.params;

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

            // Increment view count
            await prisma.product.update({
                where: { id },
                data: {
                    viewCount: {
                        increment: 1
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { product }
            });
        } catch (error) {
            next(error);
        }
    }

    async getProducts(req, res, next) {
        try {
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
            } = req.query;

            const skip = (page - 1) * limit;

            // Build filter conditions
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

            // Get products with pagination
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { 
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Basket Management Methods
    async addToBasket(req, res, next) {
        try {
            const { productId } = req.body;
            const userId = req.user.id;
            const clientId = req.user.clientId; // Assuming client ID is in user object

            // Check if product exists and is available
            const product = await prisma.product.findUnique({
                where: { id: productId }
            });

            if (!product) {
                throw createError.NotFound("Product not found");
            }

            if (product.inventoryCount <= 0) {
                throw createError.BadRequest("Product is out of stock");
            }

            // Get or create basket
            let basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                }
            });

            if (!basket) {
                basket = await prisma.basket.create({
                    data: {
                        userId,
                        clientId
                    }
                });
            }

            // Add product to basket
            await prisma.product.update({
                where: { id: productId },
                data: {
                    basketId: basket.id
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Product added to basket successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async removeFromBasket(req, res, next) {
        try {
            const { productId } = req.params;
            const userId = req.user.id;

            // Remove product from basket
            await prisma.product.update({
                where: { 
                    id: productId,
                    Basket: {
                        userId
                    }
                },
                data: {
                    basketId: null
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Product removed from basket successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async getBasket(req, res, next) {
        try {
            const userId = req.user.id;
            const clientId = req.user.clientId;

            const basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                },
                include: {
                    products: {
                        include: {
                            provider: true,
                            contentMedia: true
                        }
                    }
                }
            });

            if (!basket) {
                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    data: { 
                        basket: null,
                        total: 0
                    }
                });
            }

            // Calculate total
            const total = basket.products.reduce((acc, product) => {
                const price = product.price;
                const discountedPrice = product.discount 
                    ? price - (price * product.discount / 100)
                    : price;
                return acc + discountedPrice;
            }, 0);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { 
                    basket,
                    total
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Additional Basket Management Methods
    // مدیریت بهتر تعداد محصولات
    // اعتبارسنجی کامل سبد خرید
    // امکان انتقال به لیست علاقه‌مندی‌ها
    // عملیات‌های دسته‌جمعی
    // محاسبات مالی دقیق‌تر

    async updateBasketItemQuantity(req, res, next) {
        try {
            const { productId, quantity } = req.body;
            const userId = req.user.id;

            // Check if product exists in user's basket
            const product = await prisma.product.findFirst({
                where: {
                    id: productId,
                    Basket: {
                        userId
                    }
                }
            });

            if (!product) {
                throw createError.NotFound("Product not found in basket");
            }

            // Check if requested quantity is valid
            if (quantity > product.inventoryCount) {
                throw createError.BadRequest("Requested quantity exceeds available stock");
            }

            if (product.maxOrderQuantity && quantity > product.maxOrderQuantity) {
                throw createError.BadRequest("Quantity exceeds maximum order limit");
            }

            if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
                throw createError.BadRequest("Quantity is below minimum order requirement");
            }

            // Update quantity
            await prisma.product.update({
                where: { id: productId },
                data: { count: quantity }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Basket item quantity updated successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async validateBasket(req, res, next) {
        try {
            const userId = req.user.id;
            const clientId = req.user.clientId;

            const basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                },
                include: {
                    products: true
                }
            });

            if (!basket || !basket.products.length) {
                throw createError.BadRequest("Basket is empty");
            }

            const validationResults = await Promise.all(
                basket.products.map(async (product) => {
                    const currentProduct = await prisma.product.findUnique({
                        where: { id: product.id }
                    });

                    return {
                        productId: product.id,
                        title: product.title,
                        isValid: true,
                        issues: [
                            ...(currentProduct.inventoryCount < product.count ? ['Insufficient stock'] : []),
                            ...(currentProduct.maxOrderQuantity && product.count > currentProduct.maxOrderQuantity ? ['Exceeds maximum order quantity'] : []),
                            ...(currentProduct.minOrderQuantity && product.count < currentProduct.minOrderQuantity ? ['Below minimum order quantity'] : []),
                            ...(!currentProduct.published ? ['Product is no longer available'] : [])
                        ]
                    };
                })
            );

            const isValid = validationResults.every(result => result.issues.length === 0);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    isValid,
                    validationDetails: validationResults
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async moveToWishlist(req, res, next) {
        try {
            const { productId } = req.params;
            const userId = req.user.id;

            // Remove from basket and add to bookmarks
            await prisma.$transaction(async (prisma) => {
                // Remove from basket
                await prisma.product.update({
                    where: {
                        id: productId,
                        Basket: {
                            userId
                        }
                    },
                    data: {
                        basketId: null
                    }
                });

                // Add to bookmarks if not already bookmarked
                const existingBookmark = await prisma.bookmark.findFirst({
                    where: {
                        productId,
                        userId
                    }
                });

                if (!existingBookmark) {
                    await prisma.bookmark.create({
                        data: {
                            userId,
                            productId
                        }
                    });
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Item moved to wishlist successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async applyBulkAction(req, res, next) {
        try {
            const { action, productIds } = req.body;
            const userId = req.user.id;
            const clientId = req.user.clientId;

            // Verify all products are in user's basket
            const basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                },
                include: {
                    products: {
                        where: {
                            id: {
                                in: productIds
                            }
                        }
                    }
                }
            });

            if (!basket) {
                throw createError.NotFound("Basket not found");
            }

            if (basket.products.length !== productIds.length) {
                throw createError.BadRequest("One or more products not found in basket");
            }

            switch (action) {
                case 'REMOVE':
                    await prisma.product.updateMany({
                        where: {
                            id: {
                                in: productIds
                            },
                            basketId: basket.id
                        },
                        data: {
                            basketId: null
                        }
                    });
                    break;

                case 'MOVE_TO_WISHLIST':
                    await Promise.all(productIds.map(async (productId) => {
                        // Remove from basket
                        await prisma.product.update({
                            where: { id: productId },
                            data: { basketId: null }
                        });

                        // Add to bookmarks if not exists
                        const existingBookmark = await prisma.bookmark.findFirst({
                            where: {
                                productId,
                                userId
                            }
                        });

                        if (!existingBookmark) {
                            await prisma.bookmark.create({
                                data: {
                                    userId,
                                    productId
                                }
                            });
                        }
                    }));
                    break;

                default:
                    throw createError.BadRequest("Invalid bulk action");
            }

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: `Bulk action '${action}' completed successfully`
            });
        } catch (error) {
            next(error);
        }
    }

    async getBasketSummary(req, res, next) {
        try {
            const userId = req.user.id;
            const clientId = req.user.clientId;

            const basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                },
                include: {
                    products: true
                }
            });

            if (!basket || !basket.products.length) {
                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    data: {
                        itemCount: 0,
                        subtotal: 0,
                        totalDiscount: 0,
                        total: 0
                    }
                });
            }

            const summary = basket.products.reduce((acc, product) => {
                const itemPrice = product.price * product.count;
                const itemDiscount = product.discount 
                    ? (itemPrice * product.discount / 100)
                    : 0;

                return {
                    itemCount: acc.itemCount + product.count,
                    subtotal: acc.subtotal + itemPrice,
                    totalDiscount: acc.totalDiscount + itemDiscount,
                    total: acc.total + (itemPrice - itemDiscount)
                };
            }, {
                itemCount: 0,
                subtotal: 0,
                totalDiscount: 0,
                total: 0
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    }

    // Enhanced Basket Management
    async clearBasket(req, res, next) {
        try {
            const userId = req.user.id;
            const clientId = req.user.clientId;

            const basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                }
            });

            if (!basket) {
                throw createError.NotFound("Basket not found");
            }

            // Remove all products from basket
            await prisma.product.updateMany({
                where: {
                    basketId: basket.id
                },
                data: {
                    basketId: null
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Basket cleared successfully"
            });
        } catch (error) {
            next(error);
        }
    }
    // Bookmark Management
    async toggleBookmark(req, res, next) {
        try {
            const { productId } = req.params;
            const userId = req.user.id;

            const existingBookmark = await prisma.bookmark.findFirst({
                where: {
                    productId,
                    userId
                }
            });

            if (existingBookmark) {
                // Remove bookmark
                await prisma.bookmark.delete({
                    where: {
                        id: existingBookmark.id
                    }
                });

                return res.status(HttpStatus.OK).json({
                    statusCode: HttpStatus.OK,
                    message: "Bookmark removed successfully"
                });
            }

            // Add bookmark
            await prisma.bookmark.create({
                data: {
                    userId,
                    productId
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                message: "Product bookmarked successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarkedProducts(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user.id;

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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    bookmarks: bookmarks.map(b => b.product),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Product Search and Filter
    async searchProducts(req, res, next) {
        try {
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
            } = req.query;

            const skip = (page - 1) * limit;

            // Build complex filter conditions
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

            // Get filtered products with pagination
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Provider Product Management
    async getProviderProducts(req, res, next) {
        try {
            const { 
                page = 1, 
                limit = 10,
                status,
                published 
            } = req.query;
            const providerId = req.user.id;

            const skip = (page - 1) * limit;

            const where = {
                providerId,
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Product Publication Management
    async togglePublishStatus(req, res, next) {
        try {
            const { id } = req.params;
            const providerId = req.user.id;

            const product = await prisma.product.findFirst({
                where: {
                    id,
                    providerId
                }
            });

            if (!product) {
                throw createError.NotFound("Product not found or unauthorized");
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    published: !product.published
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    published: updatedProduct.published
                },
                message: `Product ${updatedProduct.published ? 'published' : 'unpublished'} successfully`
            });
        } catch (error) {
            next(error);
        }
    }

    // Product Statistics
    async getProductStats(req, res, next) {
        try {
            const { id } = req.params;
            const providerId = req.user.id;

            const product = await prisma.product.findFirst({
                where: {
                    id,
                    providerId
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

            // Get additional statistics
            const stats = {
                viewCount: product.viewCount,
                bookmarkCount: product._count.bookmarks,
                shareCount: product._count.shares,
                createdAt: product.createdAt,
                lastUpdated: product.updatedAt,
                published: product.published
            };

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { stats }
            });
        } catch (error) {
            next(error);
        }
    }

    // Bulk Operations
    async bulkUpdateProducts(req, res, next) {
        try {
            const { productIds, updates } = req.body;
            const providerId = req.user.id;

            // Verify ownership of all products
            const products = await prisma.product.findMany({
                where: {
                    id: { in: productIds },
                    providerId
                }
            });

            if (products.length !== productIds.length) {
                throw createError.Forbidden("Unauthorized access to one or more products");
            }

            // Perform bulk update
            await prisma.product.updateMany({
                where: {
                    id: { in: productIds }
                },
                data: {
                    ...updates,
                    updatedAt: new Date()
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: `Successfully updated ${products.length} products`
            });
        } catch (error) {
            next(error);
        }
    }

    // Advanced Search Methods
    async searchByText(req, res, next) {
        try {
            const { 
                query, 
                page = 1, 
                limit = 10,
                searchFields = ['title', 'description'] 
            } = req.query;

            const skip = (page - 1) * limit;

            // Build search conditions for each field
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async searchByCategory(req, res, next) {
        try {
            const { 
                categoryId, 
                page = 1, 
                limit = 10,
                sort = 'createdAt',
                order = 'desc'
            } = req.query;

            const skip = (page - 1) * limit;

            const where = {
                published: true,
                categories: {
                    some: {
                        categoryId: categoryId
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async searchByTags(req, res, next) {
        try {
            const { 
                tags, 
                page = 1, 
                limit = 10,
                matchAll = false 
            } = req.query;

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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Enhanced Basket Management
    async clearBasket(req, res, next) {
        try {
            const userId = req.user.id;
            const clientId = req.user.clientId;

            const basket = await prisma.basket.findUnique({
                where: {
                    clientId_userId: {
                        clientId,
                        userId
                    }
                }
            });

            if (!basket) {
                throw createError.NotFound("Basket not found");
            }

            // Remove all products from basket
            await prisma.product.updateMany({
                where: {
                    basketId: basket.id
                },
                data: {
                    basketId: null
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Basket cleared successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    async updateBasketItemQuantity(req, res, next) {
        try {
            const { productId, quantity } = req.body;
            const userId = req.user.id;

            // Validate quantity
            if (quantity < 1) {
                throw createError.BadRequest("Quantity must be at least 1");
            }

            // Get product and check inventory
            const product = await prisma.product.findFirst({
                where: {
                    id: productId,
                    Basket: {
                        userId
                    }
                }
            });

            if (!product) {
                throw createError.NotFound("Product not found in basket");
            }

            if (quantity > product.inventoryCount) {
                throw createError.BadRequest("Requested quantity exceeds available inventory");
            }

            // Update quantity
            await prisma.product.update({
                where: { id: productId },
                data: {
                    count: quantity
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Basket item quantity updated successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Trending and Popular Products
    async getTrendingProducts(req, res, next) {
        try {
            const { 
                page = 1, 
                limit = 10,
                period = 'week' // 'day', 'week', 'month'
            } = req.query;

            const skip = (page - 1) * limit;

            // Calculate date range based on period
            const dateRange = {
                day: 1,
                week: 7,
                month: 30
            };

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
                    take: parseInt(limit),
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products: products.map(product => ({
                        ...product,
                        bookmarkCount: product._count.bookmarks
                    })),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getBestSellingProducts(req, res, next) {
        try {
            const { 
                page = 1, 
                limit = 10,
                period = 'all' // 'week', 'month', 'year', 'all'
            } = req.query;

            const skip = (page - 1) * limit;

            // Calculate date range if period is specified
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
                        // Assuming you track sales in some way
                        // This could be modified based on your sales tracking implementation
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getSimilarProducts(req, res, next) {
        try {
            const { productId } = req.params;
            const { limit = 10 } = req.query;

            // Get the original product with its categories and tags
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
                throw createError.NotFound("Product not found");
            }

            // Get category IDs and tag IDs from the original product
            const categoryIds = product.categories.map(c => c.categoryId);
            const tagIds = product.tags.map(t => t.tagId);

            // Find similar products based on categories and tags
            const similarProducts = await prisma.product.findMany({
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

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products: similarProducts
                }
            });
        } catch (error) {
            next(error);
        }
    }
    
    async getProductsByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const products = await prisma.product.findMany({
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

            const total = await prisma.product.count({
                where: {
                    authorId: userId
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
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

    async getLikedProductsByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const likes = await prisma.like.findMany({
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
            });

            const total = await prisma.like.count({
                where: {
                    userId,
                    productId: {
                        not: null
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products: likes.map(like => like.product),
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

    async getBookmarkedProductsByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const bookmarks = await prisma.bookmark.findMany({
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
            });

            const total = await prisma.bookmark.count({
                where: {
                    userId,
                    productId: {
                        not: null
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products: bookmarks.map(bookmark => bookmark.product),
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

    async searchProducts(req, res, next) {
        try {
            const { q, category, tag, page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const where = {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { content: { contains: q, mode: 'insensitive' } }
                ]
            };

            if (category) {
                where.categories = {
                    some: {
                        categoryId: category
                    }
                };
            }

            if (tag) {
                where.tags = {
                    some: {
                        tagId: tag
                    }
                };
            }

            const [products, total] = await prisma.$transaction([
                prisma.product.findMany({
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
                prisma.product.count({ where })
            ]);
            
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    products,
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

    // Share a product
    async shareProduct(req, res, next) {
        try {
            const { productId } = req.params;
            const { platform, customMessage } = req.body;
            const userId = req.user.id;

            const share = await prisma.share.create({
                data: {
                    userId,
                    productId,
                    platform,
                    customMessage,
                    shareUrl: `${process.env.FRONTEND_URL}/products/${productId}`
                }
            });

            // Increment share count
            await prisma.product.update({
                where: { id: productId },
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
    ProductShop: new ProductShop()
}
// ما دو نوع تامین کننده داریم در صنف یدکی یا روغن یکی اونها که مکان ثابت دارند 
// و یکی اونخا که بصورت فریلنسری روغن یا قطعه تامینن میکنند