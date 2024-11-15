const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const ProductService = require("../services/products.service");
const BasketService = require("../services/basket.service");
const SearchService = require("../services/search.service");
const StatisticsService = require("../services/statistics.service");

class ProductController extends Controller {
    // Product CRUD Operations
    async createProduct(req, res, next) {
        try {
            const product = await ProductService.createProduct(req.body, req.files, req.user.id);
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
            const product = await ProductService.updateProduct(req.params.id, req.body, req.files, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { product }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteProduct(req, res, next) {
        try {
            await ProductService.deleteProduct(req.params.id, req.user.id);
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
            const product = await ProductService.getProduct(req.params.id);
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
            const result = await ProductService.getProducts(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async toggleBookmark(req, res, next) {
        try {
            const { productId } = req.params;
            const userId = req.user.id;

            const result = await ProductService.toggleBookmark(userId, productId);

            return res.status(result.message.includes("removed") ? HttpStatus.OK : HttpStatus.CREATED).json({
                statusCode: result.message.includes("removed") ? HttpStatus.OK : HttpStatus.CREATED,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarkedProducts(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user.id;

            const data = await bookmarkService.getBookmarkedProducts(userId, page, limit);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data
            });
        } catch (error) {
            next(error);
        }
    }

    // Basket Operations
    async addToBasket(req, res, next) {
        try {
            await BasketService.addToBasket(req.body.productId, req.user.id, req.user.clientId);
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
            await BasketService.removeFromBasket(req.params.productId, req.user.id);
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
            const result = await BasketService.getBasket(req.user.id, req.user.clientId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async updateBasketItemQuantity(req, res, next) {
        try {
            await BasketService.updateBasketItemQuantity(req.body.productId, req.body.quantity, req.user.id);
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
            const result = await BasketService.validateBasket(req.user.id, req.user.clientId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async moveToWishlist(req, res, next) {
        try {
            await BasketService.moveToWishlist(req.params.productId, req.user.id);
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
            await BasketService.applyBulkAction(req.body.action, req.body.productIds, req.user.id, req.user.clientId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: `Bulk action '${req.body.action}' completed successfully`
            });
        } catch (error) {
            next(error);
        }
    }

    async getBasketSummary(req, res, next) {
        try {
            const summary = await BasketService.getBasketSummary(req.user.id, req.user.clientId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    }

    async clearBasket(req, res, next) {
        try {
            await BasketService.clearBasket(req.user.id, req.user.clientId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Basket cleared successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Search Operations
    async searchByText(req, res, next) {
        try {
            const result = await SearchService.searchByText(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async searchByCategory(req, res, next) {
        try {
            const result = await SearchService.searchByCategory(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async searchByTags(req, res, next) {
        try {
            const result = await SearchService.searchByTags(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async searchProducts(req, res, next) {
        try {
            const result = await SearchService.searchProducts(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    // Statistics Operations
    async getTrendingProducts(req, res, next) {
        try {
            const result = await StatisticsService.getTrendingProducts(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getBestSellingProducts(req, res, next) {
        try {
            const result = await StatisticsService.getBestSellingProducts(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getSimilarProducts(req, res, next) {
        try {
            const products = await StatisticsService.getSimilarProducts(req.params.productId, req.query.limit);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { products }
            });
        } catch (error) {
            next(error);
        }
    }

    async getProductsByUserId(req, res, next) {
        try {
            const result = await StatisticsService.getProductsByUserId(req.params.userId, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getLikedProductsByUserId(req, res, next) {
        try {
            const result = await StatisticsService.getLikedProductsByUserId(req.params.userId, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarkedProductsByUserId(req, res, next) {
        try {
            const result = await StatisticsService.getBookmarkedProductsByUserId(req.params.userId, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    // Product Management Operations
    async togglePublishStatus(req, res, next) {
        try {
            const product = await ProductService.togglePublishStatus(req.params.id, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    published: product.published
                },
                message: `Product ${product.published ? 'published' : 'unpublished'} successfully`
            });
        } catch (error) {
            next(error);
        }
    }

    async getProductStats(req, res, next) {
        try {
            const stats = await ProductService.getProductStats(req.params.id, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { stats }
            });
        } catch (error) {
            next(error);
        }
    }

    async bulkUpdateProducts(req, res, next) {
        try {
            const count = await ProductService.bulkUpdateProducts(req.body.productIds, req.body.updates, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: `Successfully updated ${count} products`
            });
        } catch (error) {
            next(error);
        }
    }

    async getProviderProducts(req, res, next) {
        try {
            const result = await ProductService.getProviderProducts(req.query, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async shareProduct(req, res, next) {
        try {
            const share = await ProductService.shareProduct(req.params.productId, req.user.id, req.body);
            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: { share }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProductController();
