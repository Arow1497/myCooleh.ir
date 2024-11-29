const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// تنظیمات پیکربندی برای انواع مختلف درخواست‌ها
const COLLABORATION_CONFIG = {
    APPRENTICE: {
        modelName: 'noticeApprenticeship',
        collaboratorKey: 'apprenticeId',
        collaboratorType: 'apprentice',
        collaboratorReqsModel: 'shagerdReqsForApprenticeCoWork',
        garageReqsModel: 'garageReqsForApprenticeCoWork'
    },
    DASTYAR: {
        modelName: 'noticeDastyar',
        collaboratorKey: 'mechanicId', 
        collaboratorType: 'mechanic',
        collaboratorReqsModel: 'mechanicReqsForDastyarCoWork',
        garageReqsModel: 'garageReqsForDastyarCoWork'
    },
    OUTSOURCING: {
        modelName: 'noticeOutSourcing',
        collaboratorKey: 'acceptorGarageId',
        collaboratorType: 'acceptorGarage',
        collaboratorReqsModel: 'acceptorGarageReqsForOutSourcingCoWork', 
        garageReqsModel: 'garageReqsForOutSourcingCoWork'
    }
};

class BaseCollaborationService {
    constructor(collaborationType) {
        this.config = COLLABORATION_CONFIG[collaborationType];
        if (!this.config) {
            throw new Error(`Invalid collaboration type: ${collaborationType}`);
        }
    }

    async addCollaborationRequest(user, noticeId, collaboratorId) {
        const config = this.config;
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

    async showCollaborationRequests(ownedGarageId) {
        const config = this.config;
        if (!ownedGarageId) {
            throw createError.Unauthorized("Only garage owners can view requests");
        }

        return await prisma[config.modelName].findMany({
            where: { requesterGarageId: ownedGarageId },
            select: {
                [config.collaboratorReqsModel]: true,
                [config.garageReqsModel]: true
            }
        });
    }

    async addCollaboratorToRequest(user, collaboratorId, noticeId, body) {
        const config = this.config;
        const { ownedGarage } = user;
        const { dueDate, description, amount } = body;

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

    async removeCollaboratorFromRequest(ownedGarageId, noticeId, collaboratorId) {
        const config = this.config;
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

    async collaboratorRefuseRequest(noticeId, collaboratorId) {
        const config = this.config;
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

// ایجاد سرویس‌های مختلف با نمونه‌های متفاوت از کلاس پایه
const collaborationServices = {
    apprentice: new BaseCollaborationService('APPRENTICE'),
    dastyar: new BaseCollaborationService('DASTYAR'),
    outsourcing: new BaseCollaborationService('OUTSOURCING')
};

module.exports = {
    collaborationServices
};