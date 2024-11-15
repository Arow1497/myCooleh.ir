const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BasketService {
    async addToBasket(productId, userId, clientId) {
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw createError.NotFound("Product not found");
        }

        if (product.inventoryCount <= 0) {
            throw createError.BadRequest("Product is out of stock");
        }

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

        await prisma.product.update({
            where: { id: productId },
            data: {
                basketId: basket.id
            }
        });
    }

    async removeFromBasket(productId, userId) {
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
    }

    async getBasket(userId, clientId) {
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
            return {
                basket: null,
                total: 0
            };
        }

        const total = basket.products.reduce((acc, product) => {
            const price = product.price;
            const discountedPrice = product.discount 
                ? price - (price * product.discount / 100)
                : price;
            return acc + discountedPrice;
        }, 0);

        return { basket, total };
    }

    async updateBasketItemQuantity(productId, quantity, userId) {
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
            throw createError.BadRequest("Requested quantity exceeds available stock");
        }

        if (product.maxOrderQuantity && quantity > product.maxOrderQuantity) {
            throw createError.BadRequest("Quantity exceeds maximum order limit");
        }

        if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
            throw createError.BadRequest("Quantity is below minimum order requirement");
        }

        await prisma.product.update({
            where: { id: productId },
            data: { count: quantity }
        });
    }

    async validateBasket(userId, clientId) {
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

        return { isValid, validationDetails: validationResults };
    }

    async moveToWishlist(productId, userId) {
        await prisma.$transaction(async (prisma) => {
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
    }

    async applyBulkAction(action, productIds, userId, clientId) {
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
                    await prisma.product.update({
                        where: { id: productId },
                        data: { basketId: null }
                    });

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
    }

    async getBasketSummary(userId, clientId) {
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
            return {
                itemCount: 0,
                subtotal: 0,
                totalDiscount: 0,
                total: 0
            };
        }

        return basket.products.reduce((acc, product) => {
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
    }

    async clearBasket(userId, clientId) {
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

        await prisma.product.updateMany({
            where: {
                basketId: basket.id
            },
            data: {
                basketId: null
            }
        });
    }
}

module.exports = new BasketService();