const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { StatusCodes: HttpStatus } = require("http-status-codes");
const conversationService = require('./conversation.service');
const AttachmentProcessor = require('../../generalServices/attachmentProcess');
const processor = new AttachmentProcessor();

class ProjectManagementService {
    constructor() {
        this.prisma = prisma;
    }

    // Private helper methods
    async #validateProjectOwnership(projectId, userId) {
        const project = await this.prisma.project.findUnique({
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
        const garage = await this.prisma.garage.findFirst({
            where: { ownerId: userId }
        });

        if (!garage) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }

        return garage.id;
    }

    async #updateGarageRatings(garageId) {
        const reviews = await this.prisma.review.findMany({
            where: { garageId }
        });

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        await this.prisma.garage.update({
            where: { id: garageId },
            data: {
                rating: averageRating,
                totalReviews: reviews.length
            }
        });
    }

        // Public methods
    async acceptClientAcceptRequestInAwaitList(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async createProject(userData, projectData) {
        const garageId = await this.#validateGarageOwnership(userData.id);
        
        const project = await this.prisma.project.create({
            data: {
                ...projectData,
                garageId,
                requesterId: userData.id,
                providerId: userData.id,
                deadline: projectData.deadline ? new Date(projectData.deadline) : null
            }
        });

        await this.prisma.garage.update({
            where: { id: garageId },
            data: {
                totalProjects: {
                    increment: 1
                }
            }
        });

        return project;
    }

    async getAllProjects(userId, filters) {
        const { status, priority, startDate, endDate } = filters;
        
        let where = {
            OR: [
                { requesterId: userId },
                { providerId: userId },
                { garage: { ownerId: userId } }
            ]
        };

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        return await this.prisma.project.findMany({
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
    }

    async getProjectById(projectId, userId) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.project.findUnique({
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
    }

    async getGarageProjects(userId, filters) {
        const garageId = await this.#validateGarageOwnership(userId);
        const { status, page = 1, limit = 10 } = filters;

        const skip = (page - 1) * limit;
        
        const where = {
            garageId,
            ...(status && { status })
        };

        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    client: true,
                    mechanicsTeam: true,
                    apprenticesTeam: true,
                    reviews: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.project.count({ where })
        ]);

        return {
            projects,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async updateProject(projectId, userId, updateData) {
        await this.#validateProjectOwnership(projectId, userId);

        const protectedFields = ['id', 'requesterId', 'providerId', 'garageId', 'clientId', 'suplierStoreId', 'createdAt'];
        protectedFields.forEach(field => delete updateData[field]);

        if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
        if (updateData.startedAt) updateData.startedAt = new Date(updateData.startedAt);
        if (updateData.completedAt) updateData.completedAt = new Date(updateData.completedAt);

        return await this.prisma.project.update({
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
    }

    async updateProjectStatus(projectId, userId, status) {
        await this.#validateProjectOwnership(projectId, userId);

        const updatedProject = await this.prisma.project.update({
            where: { id: projectId },
            data: {
                status,
                ...(status === 'COMPLETED' && { completedAt: new Date() }),
                ...(status === 'IN_PROGRESS' && { startedAt: new Date() })
            }
        });

        if (status === 'COMPLETED') {
            await this.prisma.garage.update({
                where: { id: updatedProject.garageId },
                data: {
                    completedProjects: {
                        increment: 1
                    },
                    successRate: {
                        set: this.prisma.raw(`(completedProjects::float / NULLIF(totalProjects, 0)) * 100`)
                    }
                }
            });
        } else if (status === 'CANCELLED') {
            await this.prisma.garage.update({
                where: { id: updatedProject.garageId },
                data: {
                    cancelledProjects: {
                        increment: 1
                    }
                }
            });
        }

        return updatedProject;
    }

    async addMechanicToProject(projectId, userId, mechanicId) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.projectsMechanicWorkAt.create({
            data: {
                projectId,
                mechanicId,
                acceptedAt: new Date(),
                status: 'ACTIVE',
                totlalIncomeOfProject: 0
            }
        });
    }

    async removeMechanicFromProject(projectId, userId, mechanicId) {
        await this.#validateProjectOwnership(projectId, userId);

        await this.prisma.projectsMechanicWorkAt.deleteMany({
            where: {
                projectId,
                mechanicId
            }
        });
    }

    async addApprenticeToProject(projectId, userId, apprenticeId) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.projectsApprenticeWorkAt.create({
            data: {
                projectId,
                apprenticeId,
                acceptedAt: new Date(),
                status: 'ACTIVE'
            }
        });
    }

    async removeApprenticeFromProject(projectId, userId, apprenticeId) {
        await this.#validateProjectOwnership(projectId, userId);

        await this.prisma.projectsApprenticeWorkAt.deleteMany({
            where: {
                projectId,
                apprenticeId
            }
        });
    }

    async deleteProject(projectId, userId) {
        try {
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
    
          return { message: "پروژه با موفقیت حذف شد" };
        } catch (error) {
          throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
      }

    async addProjectMilestone(projectId, userId, milestoneData) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.milestone.create({
            data: {
                projectId,
                ...milestoneData,
                dueDate: new Date(milestoneData.dueDate)
            },
            include: {
                payment: true
            }
        });
    }

    async updateMilestone(projectId, milestoneId, userId, updateData) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.milestone.update({
            where: { id: milestoneId },
            data: {
                ...updateData,
                ...(updateData.dueDate && { dueDate: new Date(updateData.dueDate) }),
                ...(updateData.completedAt && { completedAt: new Date(updateData.completedAt) })
            }
        });
    }

    async addProjectReview(projectId, userId, reviewData) {
        await this.#validateProjectOwnership(projectId, userId);

        const review = await this.prisma.review.create({
            data: {
                ...reviewData,
                projectId,
                authorId: userId
            }
        });

        if (reviewData.garageId) {
            await this.#updateGarageRatings(reviewData.garageId);
        }

        return review;
    }

    async getProjectMetrics(projectId, userId) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.metric.findMany({
            where: { projectId }
        });
    }

    async addProjectAttachment(projectId, userId, attachmentData) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.attachment.create({
            data: {
                projectId,
                ...attachmentData
            }
        });
    }

    async getProjectActivityLogs(projectId, userId) {
        await this.#validateProjectOwnership(projectId, userId);

        return await this.prisma.transactionsActivityLog.findMany({
            where: { projectId },
            include: {
                transaction: true,
                complaint: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async getProjectStatistics(garageId, userId) {
        await this.#validateGarageOwnership(userId);

        const [statistics, totalProjects] = await Promise.all([
            this.prisma.project.groupBy({
                by: ['status'],
                where: { garageId },
                _count: {
                    _all: true
                },
                _avg: {
                    budget: true
                }
            }),
            this.prisma.project.count({
                where: { garageId }
            })
        ]);

        const completionRate = statistics.find(s => s.status === 'COMPLETED')?._count._all || 0;
        const averageCompletionRate = (completionRate / totalProjects) * 100;

        return {
            statistics,
            totalProjects,
            averageCompletionRate
        };
    }

    async updateProjectBudget(projectId, userId, budget) {
        await this.#validateProjectOwnership(projectId, userId);

        const updatedProject = await this.prisma.project.update({
            where: { id: projectId },
            data: { budget }
        });

        await this.prisma.transactionsActivityLog.create({
            data: {
                projectId,
                action: 'BUDGET_UPDATE',
                details: { oldBudget: updatedProject.budget, newBudget: budget }
            }
        });

        return updatedProject;
    }

    async createTransactionRoom(transactionId, userId) {
        return await conversationService.createTransactionRoom(transactionId, userId);
    }

    async sendMessage(conversationId, userId, messageData, files) {
        return await conversationService.sendMessage(conversationId, userId, messageData, files);
    }

    async getMessages(conversationId, userId, page, limit) {
        return await conversationService.getMessages(conversationId, userId, page, limit);
    }

    async getUserConversations(userId, page, limit, status) {
        return await conversationService.getUserConversations(userId, page, limit, status);
    }

    async markMessagesAsRead(conversationId, userId) {
        return await conversationService.markMessagesAsRead(conversationId, userId);
    }

    async getConversationDetails(conversationId, userId) {
        return await conversationService.getConversationDetails(conversationId, userId);
    }
}

module.exports = new ProjectManagementService();