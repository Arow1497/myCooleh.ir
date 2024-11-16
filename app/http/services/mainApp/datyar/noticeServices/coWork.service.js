const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CoworkService {
    async addCoworkRequest(user, noticeApprenticeId, apprenticeId) {
        const isApprenticeRequest = !!user.apprenticeAt;
        const garageId = isApprenticeRequest ? user.apprenticeAt?.id : user.ownedGarage?.id;
        const finalApprenticeId = isApprenticeRequest ? user.id : apprenticeId;
        
        const prismaModel = isApprenticeRequest 
            ? prisma.shagerdReqsForApprenticeCoWork 
            : prisma.garageReqsForApprenticeCoWork;

        return await prismaModel.create({
            data: {
                garage: { connect: { id: garageId } },
                apprentice: { connect: { id: finalApprenticeId } },
                noticeApprentice: { connect: { id: noticeApprenticeId } }
            }
        });
    }

    async showCoworkRequests(ownedGarageId) {
        if (!ownedGarageId) {
            throw createError.Unauthorized("Only garage owners can view requests");
        }

        return await prisma.noticeApprenticeship.findMany({
            where: { requesterGarageId: ownedGarageId },
            select: {
                shagerdReqsForApprenticeCoWork: true,
                garageReqsForApprenticeCoWork: true
            }
        });
    }

    async addApprenticeToRequest(user, apprenticeId, noticeApprenticeId, body) {
        const { ownedGarage } = user;
        const { dueDate, description, amount } = body;

        if (!ownedGarage?.id) {
            throw createError.Unauthorized("Only garage owners can add apprentices");
        }

        return await prisma.$transaction(async (prisma) => {
            const notice = await prisma.noticeApprenticeship.update({
                where: { id: noticeApprenticeId },
                data: {
                    apprenticeId,
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
                    noticeApprentice: { connect: { id: noticeApprenticeId } },
                    transactionsActivityLog: {
                        create: {
                            action: "ترنزاکشن درخواست شاگرد ایجاد شد",
                            project: { connect: { id: notice.projectId } },
                            noticeApprentice: { connect: { id: noticeApprenticeId } }
                        }
                    }
                }
            });

            return { notice, transaction };
        });
    }

    async removeApprenticeFromRequest(ownedGarageId, noticeApprenticeId, apprenticeId) {
        if (!ownedGarageId) {
            throw createError.Unauthorized("Only garage owners can remove apprentices");
        }

        return await prisma.noticeApprenticeship.update({
            where: { id: noticeApprenticeId },
            data: {
                apprentice: {
                    disconnect: { id: apprenticeId }
                }
            }
        });
    }

    async apprenticeRefuseRequest(noticeApprenticeId, apprenticeId) {
        const noticeApprentice = await prisma.noticeApprenticeship.findUnique({
            where: { id: noticeApprenticeId }
        });

        if (!noticeApprentice || noticeApprentice.apprenticeId !== apprenticeId) {
            throw createError.NotAcceptable("ویرایش ترنزاکشن فقط برای طرفین آن مجاز است");
        }

        return await prisma.noticeApprenticeship.update({
            where: { id: noticeApprenticeId },
            data: {
                apprentice: {
                    disconnect: { id: apprenticeId }
                }
            }
        });
    }
}

module.exports = new CoworkService();