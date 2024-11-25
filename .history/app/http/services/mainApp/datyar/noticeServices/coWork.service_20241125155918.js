const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CollaborationService {
    constructor() {
        // تعریف انواع مختلف درخواست‌ها و مشخصات مربوط به هر کدام
        this.requestTypes = {
            apprentice: {
                modelName: 'noticeApprenticeship',
                collaboratorKey: 'apprenticeId',
                collaboratorType: 'apprentice',
                collaboratorReqsModel: 'shagerdReqsForApprenticeCoWork',
                garageReqsModel: 'garageReqsForApprenticeCoWork'
            },
            dastyar: {
                modelName: 'noticeDastyar',
                collaboratorKey: 'mechanicId',
                collaboratorType: 'mechanic',
                collaboratorReqsModel: 'mechanicReqsForDastyarCoWork',
                garageReqsModel: 'garageReqsForDastyarCoWork'
            },
            outSourcing: {
                modelName: 'noticeOutSourcing',
                collaboratorKey: 'acceptorGarageId',
                collaboratorType: 'acceptorGarage',
                collaboratorReqsModel: 'acceptorGarageReqsForOutSourcingCoWork',
                garageReqsModel: 'garageReqsForOutSourcingCoWork'
            }
        };
    }

    async addCollaborationRequest(user, noticeId, collaboratorId, requestType) {
        const config = this.requestTypes[requestType];
        if (!config) {
            throw createError.BadRequest("Invalid request type");
        }

        const isCollaboratorRequest = !!user.apprenticeAt;
        const garageId = isCollaboratorRequest ? user.apprenticeAt?.id : user.ownedGarage?.id;
        const finalCollaboratorId = isCollaboratorRequest ? user.id : collaboratorId;
        
        const prismaModel = isCollaboratorRequest 
            ? prisma[config.collaboratorReqsModel]
            : prisma[config.garageReqsModel];

        return await prismaModel.create({
            data: {
                garage: { connect: { id: garageId } },
                [config.collaboratorType]: { connect: { id: finalCollaboratorId } },
                [`notice${config.collaboratorType.charAt(0).toUpperCase() + config.collaboratorType.slice(1)}`]: { 
                    connect: { id: noticeId } 
                }
            }
        });
    }

    async showCollaborationRequests(ownedGarageId, requestType) {
        if (!ownedGarageId) {
            throw createError.Unauthorized("Only garage owners can view requests");
        }

        const config = this.requestTypes[requestType];
        if (!config) {
            throw createError.BadRequest("Invalid request type");
        }

        return await prisma[config.modelName].findMany({
            where: { requesterGarageId: ownedGarageId },
            select: {
                [config.collaboratorReqsModel]: true,
                [config.garageReqsModel]: true
            }
        });
    }

    async addCollaboratorToRequest(user, collaboratorId, noticeId, body, requestType) {
        const { ownedGarage } = user;
        const { dueDate, description, amount } = body;
        const config = this.requestTypes[requestType];

        if (!config) {
            throw createError.BadRequest("Invalid request type");
        }

        if (!ownedGarage?.id) {
            throw createError.Unauthorized("Only garage owners can add collaborators");
        }

        return await prisma.$transaction(async (prisma) => {
            const notice = await prisma[config.modelName].update({
                where: { id: noticeId },
                data: {
                    [config.collaboratorKey]: collaboratorId,
                    milestones: {
                        create: {
                            dueDate,
                            description,
                            payment: { create: { amount } }
                        }
                    }
                }
            });

            const transaction = await prisma.transaction.create({
                data: {
                    amount: notice.budget,
                    project: { connect: { id: notice.projectId } },
                    [config.modelName]: { connect: { id: noticeId } },
                    transactionsActivityLog: {
                        create: {
                            action: `ترنزاکشن درخواست ${config.collaboratorType} ایجاد شد`,
                            project: { connect: { id: notice.projectId } },
                            [config.modelName]: { connect: { id: noticeId } }
                        }
                    }
                }
            });

            return { notice, transaction };
        });
    }

    async removeCollaboratorFromRequest(ownedGarageId, noticeId, collaboratorId, requestType) {
        const config = this.requestTypes[requestType];
        if (!config) {
            throw createError.BadRequest("Invalid request type");
        }

        if (!ownedGarageId) {
            throw createError.Unauthorized("Only garage owners can remove collaborators");
        }

        return await prisma[config.modelName].update({
            where: { id: noticeId },
            data: {
                [config.collaboratorType]: {
                    disconnect: { id: collaboratorId }
                }
            }
        });
    }

    async collaboratorRefuseRequest(noticeId, collaboratorId, requestType) {
        const config = this.requestTypes[requestType];
        if (!config) {
            throw createError.BadRequest("Invalid request type");
        }

        const notice = await prisma[config.modelName].findUnique({
            where: { id: noticeId }
        });

        if (!notice || notice[config.collaboratorKey] !== collaboratorId) {
            throw createError.NotAcceptable("ویرایش ترنزاکشن فقط برای طرفین آن مجاز است");
        }

        return await prisma[config.modelName].update({
            where: { id: noticeId },
            data: {
                [config.collaboratorType]: {
                    disconnect: { id: collaboratorId }
                }
            }
        });
    }
}

module.exports = new CollaborationService();