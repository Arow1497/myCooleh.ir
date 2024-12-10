const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const projectService = require("../services/projects.service");

class ProjectManagementController extends Controller {

    // Public methods
    async acceptClientAcceptRequestInAwaitList(req, res, next){
    try {
        
    } catch (error) {
        
    }
   }

    async createProject(req) {
        try {
            const project = await projectService.createProject(req.user, req.body);
            return {
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "پروژه با موفقیت ایجاد شد",
                    project
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async getAllProjects(req) {
        try {
            const projects = await projectService.getAllProjects(req.user.id, req.query);
            return this.success(projects);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async getProjectById(req) {
        try {
            const project = await projectService.getProjectById(req.params.projectId, req.user.id);
            return this.success(project);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async getGarageProjects(req) {
        try {
            const result = await projectService.getGarageProjects(req.user.id, req.query);
            return {
                statusCode: HttpStatus.OK,
                data: result
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async updateProject(req) {
        try {
            const updatedProject = await projectService.updateProject(
                req.params.projectId,
                req.user.id,
                req.body
            );
            return this.success(updatedProject);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async updateProjectStatus(req) {
        try {
            const updatedProject = await projectService.updateProjectStatus(
                req.params.projectId,
                req.user.id,
                req.body.status
            );
            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "وضعیت پروژه با موفقیت بروزرسانی شد",
                    project: updatedProject
                }
            };
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }


    async addMechanicToProject(req) {
        try {
            const projectMechanic = await projectService.addMechanicToProject(
                req.body.projectId,
                req.user.id,
                req.body.mechanicId
            );
            return this.success(projectMechanic);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async removeMechanicFromProject(req) {
        try {
            await projectService.removeMechanicFromProject(
                req.params.projectId,
                req.user.id,
                req.params.mechanicId
            );
            return this.success({ message: "مکانیک با موفقیت از پروژه حذف شد" });
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async addApprenticeToProject(req) {
        try {
            const projectApprentice = await projectService.addApprenticeToProject(
                req.body.projectId,
                req.user.id,
                req.body.apprenticeId
            );
            return this.success(projectApprentice);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async removeApprenticeFromProject(req) {
        try {
            await projectService.removeApprenticeFromProject(
                req.params.projectId,
                req.user.id,
                req.params.apprenticeId
            );
            return this.success({ message: "شاگرد با موفقیت از پروژه حذف شد" });
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async deleteProject(req, res, next) {
        try {
          const { projectId } = req.params;
          const userId = req.user.id;
    
          const result = await ProjectService.deleteProject(projectId, userId);
    
          return success(res, result);
        } catch (error) {
          next(error);
        }
      }
      
    async addProjectMilestone(req) {
        try {
            const milestone = await projectService.addProjectMilestone(
                req.params.projectId,
                req.user.id,
                req.body
            );
            return this.success(milestone);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async updateMilestone(req) {
        try {
            const milestone = await projectService.updateMilestone(
                req.params.projectId,
                req.params.milestoneId,
                req.user.id,
                req.body
            );
            return this.success(milestone);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async addProjectReview(req) {
        try {
            const review = await projectService.addProjectReview(
                req.params.projectId,
                req.user.id,
                req.body
            );
            return this.success(review);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async getProjectMetrics(req) {
        try {
            const metrics = await projectService.getProjectMetrics(
                req.params.projectId,
                req.user.id
            );
            return this.success(metrics);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async addProjectAttachment(req) {
        try {
            const attachment = await projectService.addProjectAttachment(
                req.params.projectId,
                req.user.id,
                req.body
            );
            return this.success(attachment);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async getProjectActivityLogs(req) {
        try {
            const activityLogs = await projectService.getProjectActivityLogs(
                req.params.projectId,
                req.user.id
            );
            return this.success(activityLogs);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async getProjectStatistics(req) {
        try {
            const statistics = await projectService.getProjectStatistics(
                req.params.garageId,
                req.user.id
            );
            return this.success(statistics);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async updateProjectBudget(req) {
        try {
            const updatedProject = await projectService.updateProjectBudget(
                req.params.projectId,
                req.user.id,
                req.body.budget
            );
            return this.success(updatedProject);
        } catch (error) {
            throw createError(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    async createTransactionRoom(req, res, next) {
        try {
            const conversation = await projectService.createTransactionRoom(
                req.params.transactionId,
                req.user.id
            );
            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "اتاق گفتگو با موفقیت ایجاد شد",
                    conversationId: conversation.id
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req, res, next) {
        try {
            const message = await projectService.sendMessage(
                req.params.conversationId,
                req.user.id,
                req.body,
                req.files
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پیام با موفقیت ارسال شد",
                    messageData: message
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getMessages(req, res, next) {
        try {
            const { messages, totalMessages } = await projectService.getMessages(
                req.params.conversationId,
                req.user.id,
                req.query.page,
                req.query.limit
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    messages,
                    pagination: {
                        currentPage: Number(req.query.page),
                        totalPages: Math.ceil(totalMessages / req.query.limit),
                        totalMessages,
                        limit: Number(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserConversations(req, res, next) {
        try {
            const { conversations, totalConversations } = await projectService.getUserConversations(
                req.user.id,
                req.query.page,
                req.query.limit,
                req.query.status
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    conversations,
                    pagination: {
                        currentPage: Number(req.query.page),
                        totalPages: Math.ceil(totalConversations / req.query.limit),
                        totalConversations,
                        limit: Number(req.query.limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async markMessagesAsRead(req, res, next) {
        try {
            const { count } = await projectService.markMessagesAsRead(
                req.params.conversationId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: count > 0 
                        ? "پیام‌ها به عنوان خوانده شده علامت‌گذاری شدند"
                        : "پیام ناخوانده‌ای وجود ندارد",
                    count
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getConversationDetails(req, res, next) {
        try {
            const conversationDetails = await projectService.getConversationDetails(
                req.params.conversationId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    conversation: conversationDetails
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Add other controller methods that delegate to service layer...
    // Include methods for managing mechanics, apprentices, milestones, reviews, etc.
}

module.exports = {
    ProjectManagementController: new ProjectManagementController()
};