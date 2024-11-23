const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProjectManagementController extends Controller {
    // Private helper methods
    async #validateProjectOwnership(projectId, userId) {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                requester: true,
                provider: true,
                garage: true
            }
        });

        if (!project) throw createError.NotFound("پروژه مورد نظر یافت نشد");

        const isOwner = project.requesterId === userId || 
                       project.providerId === userId || 
                       project.garage.ownerId === userId;

        if (!isOwner) throw createError.Unauthorized("شما مجوز دسترسی به این پروژه را ندارید");

        return project;
    }

    async #validateGarageOwnership(userId) {
        const garage = await prisma.garage.findFirst({
            where: { ownerId: userId }
        });

        if (!garage) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }

        return garage.id;
    }

    // Create a new project
    async createProject(req) {
        try {
            const {
                title,
                car,
                plateNumber,
                chassisNumber,
                carMillage,
                buildYear,
                brokeReportDetails,
                fixReportDetails,
                description,
                budget,
                deadline,
                requirements,
                garageId,
                clientId,
                suplierStoreId
            } = req.body;

            const userId = req.user.id;

            // Validate garage exists
            const garage = await prisma.garage.findUnique({
                where: { id: garageId }
            });
            if (!garage) throw createError.NotFound("گاراژ مورد نظر یافت نشد");

            // Create project profile for requester
            const requesterProfile = await prisma.projectProfile.create({
                data: {
                    userId: userId,
                    role: "REQUESTER"
                }
            });

            // Create project profile for provider
            const providerProfile = await prisma.projectProfile.create({
                data: {
                    userId: garage.ownerId,
                    role: "PROVIDER"
                }
            });

            // Create the project
            const project = await prisma.project.create({
                data: {
                    title,
                    car,
                    plateNumber,
                    chassisNumber,
                    carMillage,
                    buildYear,
                    brokeReportDetails,
                    fixReportDetails,
                    description,
                    budget,
                    deadline: deadline ? new Date(deadline) : null,
                    requirements,
                    requesterId: requesterProfile.id,
                    providerId: providerProfile.id,
                    garageId,
                    clientId,
                    suplierStoreId
                },
                include: {
                    garage: true,
                    client: true,
                    acceptedSuppleirStore: true
                }
            });

            return this.success(project);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Get all projects
    async getAllProjects(req) {
        try {
            const { status, priority, startDate, endDate } = req.query;
            const userId = req.user.id;

            let where = {
                OR: [
                    { requesterId: userId },
                    { providerId: userId },
                    { garage: { ownerId: userId } }
                ]
            };

            // Add filters
            if (status) where.status = status;
            if (priority) where.priority = priority;
            if (startDate && endDate) {
                where.createdAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const projects = await prisma.project.findMany({
                where,
                include: {
                    garage: true,
                    client: true,
                    acceptedSuppleirStore: true,
                    mechanicsTeam: true,
                    apprenticesTeam: true,
                    milestones: true,
                    reviews: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return this.success(projects);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Get project by ID
    async getProjectById(req) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            const project = await this.#validateProjectOwnership(projectId, userId);

            const fullProject = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                    garage: true,
                    client: true,
                    acceptedSuppleirStore: true,
                    mechanicsTeam: true,
                    apprenticesTeam: true,
                    milestones: true,
                    reviews: true,
                    transaction: true,
                    conversation: true
                }
            });

            return this.success(fullProject);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Update project
    async updateProject(req) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            await this.#validateProjectOwnership(projectId, userId);

            // Remove protected fields from update data
            const protectedFields = ['id', 'requesterId', 'providerId', 'garageId', 'clientId', 'suplierStoreId', 'createdAt'];
            protectedFields.forEach(field => delete updateData[field]);

            // Handle date fields
            if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
            if (updateData.startedAt) updateData.startedAt = new Date(updateData.startedAt);
            if (updateData.completedAt) updateData.completedAt = new Date(updateData.completedAt);

            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: updateData,
                include: {
                    garage: true,
                    client: true,
                    acceptedSuppleirStore: true,
                    mechanicsTeam: true,
                    apprenticesTeam: true,
                    milestones: true
                }
            });

            return this.success(updatedProject);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Update project status
    async updateProjectStatus(req) {
        try {
            const { projectId } = req.params;
            const { status } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: {
                    status,
                    ...(status === 'COMPLETED' && { completedAt: new Date() }),
                    ...(status === 'IN_PROGRESS' && { startedAt: new Date() })
                }
            });

            return this.success(updatedProject);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Add mechanic to project
    async addMechanicToProject(req) {
        try {
            const { projectId, mechanicId } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const projectMechanic = await prisma.projectsMechanicWorkAt.create({
                data: {
                    projectId,
                    mechanicId,
                    acceptedAt: new Date(),
                    status: 'ACTIVE',
                    totlalIncomeOfProject: 0
                }
            });

            return this.success(projectMechanic);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Remove mechanic from project
    async removeMechanicFromProject(req) {
        try {
            const { projectId, mechanicId } = req.params;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            await prisma.projectsMechanicWorkAt.deleteMany({
                where: {
                    projectId,
                    mechanicId
                }
            });

            return this.success({ message: "مکانیک با موفقیت از پروژه حذف شد" });
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Delete project
    async deleteProject(req) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            // Delete related records first
            await prisma.$transaction([
                prisma.projectsMechanicWorkAt.deleteMany({ where: { projectId } }),
                prisma.projectsApprenticeWorkAt.deleteMany({ where: { projectId } }),
                prisma.milestone.deleteMany({ where: { projectId } }),
                prisma.review.deleteMany({ where: { projectId } }),
                prisma.transaction.deleteMany({ where: { projectId } }),
                prisma.project.delete({ where: { id: projectId } })
            ]);

            return this.success({ message: "پروژه با موفقیت حذف شد" });
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async addApprenticeToProject(req) {
        try {
            const { projectId, apprenticeId } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const projectApprentice = await prisma.projectsApprenticeWorkAt.create({
                data: {
                    projectId,
                    apprenticeId,
                    acceptedAt: new Date(),
                    status: 'ACTIVE'
                }
            });

            return this.success(projectApprentice);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Remove apprentice from project
    async removeApprenticeFromProject(req) {
        try {
            const { projectId, apprenticeId } = req.params;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            await prisma.projectsApprenticeWorkAt.deleteMany({
                where: {
                    projectId,
                    apprenticeId
                }
            });

            return this.success({ message: "شاگرد با موفقیت از پروژه حذف شد" });
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Add project milestone
    async addProjectMilestone(req) {
        try {
            const { projectId } = req.params;
            const { title, description, dueDate, garagePartOrderId, metricId, couponId } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const milestone = await prisma.milestone.create({
                data: {
                    projectId,
                    title,
                    description,
                    dueDate: new Date(dueDate),
                    garagePartOrderId,
                    metricId,
                    couponId
                },
                include: {
                    payment: true
                }
            });

            return this.success(milestone);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Update project milestone
    async updateMilestone(req) {
        try {
            const { projectId, milestoneId } = req.params;
            const updateData = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const milestone = await prisma.milestone.update({
                where: { id: milestoneId },
                data: {
                    ...updateData,
                    ...(updateData.dueDate && { dueDate: new Date(updateData.dueDate) }),
                    ...(updateData.completedAt && { completedAt: new Date(updateData.completedAt) })
                }
            });

            return this.success(milestone);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Add project review
    async addProjectReview(req) {
        try {
            const { projectId } = req.params;
            const {
                rating,
                comment,
                garageId,
                supplierStoreId,
                clientId,
                targetId,
                garagePartOrderId,
                metricId,
                couponId
            } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const review = await prisma.review.create({
                data: {
                    projectId,
                    garageId,
                    supplierStoreId,
                    clientId,
                    authorId: userId,
                    targetId,
                    garagePartOrderId,
                    metricId,
                    couponId,
                    rating,
                    comment
                }
            });

            // Update garage ratings
            await this.#updateGarageRatings(garageId);

            return this.success(review);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Helper method to update garage ratings
    async #updateGarageRatings(garageId) {
        const reviews = await prisma.review.findMany({
            where: { garageId }
        });

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        await prisma.garage.update({
            where: { id: garageId },
            data: {
                rating: averageRating,
                totalReviews: reviews.length
            }
        });
    }

    // Get project metrics
    async getProjectMetrics(req) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const metrics = await prisma.metric.findMany({
                where: { projectId }
            });

            return this.success(metrics);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Add project attachment
    async addProjectAttachment(req) {
        try {
            const { projectId } = req.params;
            const { title, url, type } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const attachment = await prisma.attachment.create({
                data: {
                    projectId,
                    title,
                    url,
                    type
                }
            });

            return this.success(attachment);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Get project conversation
    async getProjectConversation(req) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const conversations = await prisma.conversation.findMany({
                where: { projectId },
                include: {
                    messages: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return this.success(conversations);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Get project activity logs
    async getProjectActivityLogs(req) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const activityLogs = await prisma.transactionsActivityLog.findMany({
                where: { projectId },
                include: {
                    transaction: true,
                    complaint: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return this.success(activityLogs);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Get project statistics
    async getProjectStatistics(req) {
        try {
            const { garageId } = req.params;
            const userId = req.user.id;

            await this.#validateGarageOwnership(userId);

            const statistics = await prisma.project.groupBy({
                by: ['status'],
                where: { garageId },
                _count: {
                    _all: true
                },
                _avg: {
                    budget: true
                }
            });

            const totalProjects = await prisma.project.count({
                where: { garageId }
            });

            const completionRate = statistics.find(s => s.status === 'COMPLETED')?._count._all || 0;
            const averageCompletionRate = (completionRate / totalProjects) * 100;

            return this.success({
                statistics,
                totalProjects,
                averageCompletionRate
            });
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    // Update project budget
    async updateProjectBudget(req) {
        try {
            const { projectId } = req.params;
            const { budget } = req.body;
            const userId = req.user.id;

            await this.#validateProjectOwnership(projectId, userId);

            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: { budget }
            });

            // Create activity log for budget update
            await prisma.transactionsActivityLog.create({
                data: {
                    projectId,
                    action: 'BUDGET_UPDATE',
                    details: { oldBudget: updatedProject.budget, newBudget: budget }
                }
            });

            return this.success(updatedProject);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }
}


module.exports = {
    ProjectManagementController: new ProjectManagementController()
};


// getAllOfGarageProjects
// LikeProject
// dislikeProject
// addClientCommentAndRateForProject
// addGarageCommentAndRateForProject
// createInvoice_FactorForProject
// createOilAutoServiceProject
// shareProject
  
