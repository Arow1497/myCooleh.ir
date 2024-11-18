const createHttpError = require('http-errors');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { addCategorySchema, updateCategorySchema } = require("../../../validators/admin/category.schema");

class CategoryController extends Controller {
    /**
     * Create a new category
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async addCategory(req, res, next) {
        try {
            await addCategorySchema.validateAsync(req.body);
            const { title, description, parent } = req.body;

            const existingCategory = await prisma.category.findUnique({
                where: { title }
            });
            if (existingCategory) {
                throw createHttpError.Conflict("دسته‌بندی با این عنوان قبلاً ثبت شده است");
            }

            const category = await prisma.category.create({
                data: {
                    title,
                    description,
                    parentId: parent,
                },
            });

            return res.status(201).json({
                success: true,
                statusCode: 201,
                data: {
                    message: "دسته بندی با موفقیت افزوده شد",
                    category
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all root categories (categories without parents)
     */
    async getAllParents(req, res, next) {
        try {
            const parents = await prisma.category.findMany({
                where: { parentId: null },
                include: {
                    _count: {
                        select: {
                            children: true,
                            posts: true,
                            NoticeAll: true
                        }
                    }
                }
            });

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: { parents }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get children of a specific category with additional statistics
     */
    async getChildOfParents(req, res, next) {
        try {
            const { parent } = req.params;

            const children = await prisma.category.findUnique({
                where: { id: parent },
                include: {
                    children: {
                        include: {
                            _count: {
                                select: {
                                    posts: true,
                                    NoticeAll: true
                                }
                            }
                        }
                    }
                }
            });

            if (!children) {
                throw createHttpError.NotFound("دسته‌بندی مورد نظر یافت نشد");
            }

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: { children }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get complete category tree with statistics
     */
    async getAllCategory(req, res, next) {
        try {
            const allCategories = await prisma.category.findMany({
                include: {
                    _count: {
                        select: {
                            children: true,
                            posts: true,
                            NoticeAll: true
                        }
                    }
                }
            });

            function buildTree(categories, parentId = null) {
                return categories
                    .filter(category => category.parentId === parentId)
                    .map(category => ({
                        ...category,
                        children: buildTree(categories, category.id)
                    }))
                    .map(category => ({
                        ...category,
                        ...(category.children.length === 0 ? {} : { children: category.children })
                    }));
            }

            const categoryTree = buildTree(allCategories);

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: { categories: categoryTree }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove category and all its descendants
     */
    async removeCategory(req, res, next) {
        try {
            const { categoryId } = req.params;

            // Check if category exists and get related counts
            const categoryExists = await prisma.category.findUnique({
                where: { id: categoryId },
                include: {
                    _count: {
                        select: {
                            posts: true,
                            NoticeAll: true
                        }
                    }
                }
            });

            if (!categoryExists) {
                throw createHttpError.NotFound("دسته‌بندی مورد نظر یافت نشد");
            }

            // If category has related items, prevent deletion
            if (categoryExists._count.posts > 0 || categoryExists._count.NoticeAll > 0) {
                throw createHttpError.Conflict(
                    "این دسته‌بندی دارای پست یا اعلان است و نمی‌تواند حذف شود"
                );
            }

            const deleteResult = await prisma.$transaction(async (tx) => {
                const allIds = await this.getAllDescendantIds(categoryId);
                return await tx.category.deleteMany({
                    where: {
                        id: {
                            in: [...allIds, categoryId]
                        }
                    }
                });
            });

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: {
                    message: "دسته‌بندی و تمام زیرمجموعه‌های آن با موفقیت حذف شدند",
                    deletedCount: deleteResult.count
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update category details
     */
    async updateCategory(req, res, next) {
        try {
            const { id } = req.params;
            await updateCategorySchema.validateAsync(req.body);
            const { title, description } = req.body;

            const category = await this.checkExistCategory(id);

            // Check if new title already exists for another category
            if (title && title !== category.title) {
                const existingCategory = await prisma.category.findUnique({
                    where: { title }
                });
                if (existingCategory) {
                    throw createHttpError.Conflict("دسته‌بندی با این عنوان قبلاً ثبت شده است");
                }
            }

            const updatedCategory = await prisma.category.update({
                where: { id },
                data: {
                    title,
                    description
                }
            });

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: {
                    message: "دسته‌بندی با موفقیت بروزرسانی شد",
                    category: updatedCategory
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get category statistics
     */
    async getCategoryStats(req, res, next) {
        try {
            const { id } = req.params;

            const stats = await prisma.category.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            children: true,
                            posts: true,
                            NoticeAll: true
                        }
                    },
                    posts: {
                        select: {
                            post: {
                                select: {
                                    title: true,
                                    id: true,
                                    createdAt: true
                                }
                            }
                        },
                        take: 5,
                        orderBy: {
                            post: {
                                createdAt: 'desc'
                            }
                        }
                    }
                }
            });

            if (!stats) {
                throw createHttpError.NotFound("دسته‌بندی مورد نظر یافت نشد");
            }

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: { stats }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Move category to new parent
     */
    async moveCategory(req, res, next) {
        try {
            const { categoryId, newParentId } = req.body;

            // Prevent moving to own descendant
            const descendants = await this.getAllDescendantIds(categoryId);
            if (descendants.includes(newParentId)) {
                throw createHttpError.BadRequest("نمی‌توان دسته‌بندی را به زیرمجموعه خودش منتقل کرد");
            }

            const updatedCategory = await prisma.category.update({
                where: { id: categoryId },
                data: { parentId: newParentId }
            });

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: {
                    message: "دسته‌بندی با موفقیت منتقل شد",
                    category: updatedCategory
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Helper method to get all descendant IDs of a category
     */
    async getAllDescendantIds(categoryId) {
        const descendants = await prisma.category.findMany({
            where: {
                parentId: categoryId
            }
        });

        let allIds = [];
        for (const descendant of descendants) {
            const childIds = await this.getAllDescendantIds(descendant.id);
            allIds = [...allIds, descendant.id, ...childIds];
        }

        return allIds;
    }

    /**
     * Search categories by title
     */
    async searchCategories(req, res, next) {
        try {
            const { query } = req.query;
            const categories = await prisma.category.findMany({
                where: {
                    title: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                include: {
                    _count: {
                        select: {
                            children: true,
                            posts: true,
                            NoticeAll: true
                        }
                    }
                }
            });

            return res.status(200).json({
                success: true,
                statusCode: 200,
                data: { categories }
            });
        } catch (error) {
            next(error);
        }
    }

    // Utility method to check if category exists
    async checkExistCategory(id) {
        const category = await prisma.category.findUnique({
            where: { id }
        });
        if (!category) throw createHttpError.NotFound("دسته بندی یافت نشد");
        return category;
    }

    
    async getCategoryTree(parentId = null) {
        const categories = await prisma.category.findMany({
          where: {
            parent: parentId
          },
          include: {
            children: true // فقط یک سطح از children را لود می‌کنیم
          }
        });
        // بازگشت برای هر child برای لود کردن children‌های آن
        for (const category of categories) {
          category.children = await getCategoryTree(category.id);
        }
      
        return categories;
      }
}

module.exports = {
    CategoryController: new CategoryController()
};