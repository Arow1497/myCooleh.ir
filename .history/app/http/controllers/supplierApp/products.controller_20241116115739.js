const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const {ProductService} = require("../../services/supplierApp/productsServices/products.service");
const {BasketService} = require("../../services/supplierApp/productsServices/basket.service");
const {SearchService} = require("../../services/supplierApp/productsServices/search.service");
const {StatisticsService} = require("../../services/supplierApp/productsServices/statistic.service");
const {CreateProductDTO, UpdateProductDTO} = require("../../services/supplierApp/productsServices/products.service");

class ProductController extends Controller {
    constructor(){
        super();
        this.productService = ProductService;
        this.basketService = BasketService;
        this.searchService = SearchService;
        this.statisticsService = StatisticsService;
    }
    // Product CRUD Operations
    async createProduct(req, res, next) {
        try {
            // تبدیل داده‌های درخواست به DTO
      const productData = {
        ...req.body,
        files: req.files
      };
      const createProductDTO = new CreateProductDTO(productData);
      const providerId = req.user.id;
      
            const product = await this.productService.createProduct(createProductDTO, providerId);
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
            // ساخت DTO از داده‌های درخواست
            const updateData = {
                ...req.body,
                files: req.files
            };
            const updateProductDTO = new UpdateProductDTO(updateData);

            const product = await this.productService.updateProduct( id, providerId, updateProductDTO);
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
            await this.productService.deleteProduct(req.params.id, req.user.id);
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
            const product = await this.productService.getProduct(req.params.id);
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
            const result = await this.productService.getProducts(req.query);
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

            const result = await this.productService.toggleBookmark(userId, productId);

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
            await this.basketService.addToBasket(req.body.productId, req.user.id, req.user.clientId);
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
            await this.basketService.removeFromBasket(req.params.productId, req.user.id);
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
            const result = await this.basketService.getBasket(req.user.id, req.user.clientId);
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
            await this.basketService.updateBasketItemQuantity(req.body.productId, req.body.quantity, req.user.id);
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
            const result = await this.basketService.validateBasket(req.user.id, req.user.clientId);
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
            await this.basketService.moveToWishlist(req.params.productId, req.user.id);
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
            await this.basketService.applyBulkAction(req.body.action, req.body.productIds, req.user.id, req.user.clientId);
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
            const summary = await this.basketService.getBasketSummary(req.user.id, req.user.clientId);
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
            await this.basketService.clearBasket(req.user.id, req.user.clientId);
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
            const result = await this.searchService.searchByText(req.query);
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
            const result = await this.searchService.searchByCategory(req.query);
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
            const result = await this.searchService.searchByTags(req.query);
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
            const result = await this.searchService.searchProducts(req.query);
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
            const result = await this.statisticsService.getTrendingProducts(req.query);
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
            const result = await this.statisticsService.getBestSellingProducts(req.query);
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
            const products = await this.statisticsService.getSimilarProducts(req.params.productId, req.query.limit);
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
            const result = await this.statisticsService.getProductsByUserId(req.params.userId, req.query);
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
            const result = await this.statisticsService.getLikedProductsByUserId(req.params.userId, req.query);
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
            const result = await this.statisticsService.getBookmarkedProductsByUserId(req.params.userId, req.query);
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
            const product = await this.productService.togglePublishStatus(req.params.id, req.user.id);
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
            const stats = await this.productService.getProductStats(req.params.id, req.user.id);
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
            const count = await this.productService.bulkUpdateProducts(req.body.productIds, req.body.updates, req.user.id);
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
            const result = await this.productService.getProviderProducts(req.query, req.user.id);
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
            const share = await this.productService.shareProduct(req.params.productId, req.user.id, req.body);
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
