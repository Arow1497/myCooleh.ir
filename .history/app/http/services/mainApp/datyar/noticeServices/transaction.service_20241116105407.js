const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TransactionService {
    async validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                noticeApprentice: {
                    select: {
                        apprenticeId: true,
                        publisherId: true
                    }
                }
            }
        });

        if (!transaction) throw createError.NotFound("Transaction not found");

        const isOwner = role === 'apprentice' 
            ? transaction.noticeApprentice.apprenticeId === userId
            : transaction.noticeApprentice.publisherId === userId;

        if (!isOwner) throw createError.Unauthorized("Not authorized to perform this action");

        return transaction;
    }

    async confirmTransactionCompletion(transactionId, userId, role) {
        await this.validateTransactionOwnership(transactionId, userId, role);

        const updateData = role === 'apprentice' 
            ? { providerConfirmedCompletion: true, providerConfirmedPayment: true }
            : { requesterConfirmedCompletion: true, requesterConfirmedPayment: true };

        return await prisma.transaction.update({
            where: { id: transactionId },
            data: updateData
        });
    }

    async addReview(user, noticeApprenticeId, body) {
        const { comment, rating, projectId, targetId, apprenticeId } = body;
        const { id: authorId, ownedGarage } = user;
        
        const isGarageOwner = !!ownedGarage;
        const garageId = ownedGarage?.id;
        const finalTargetId = isGarageOwner ? apprenticeId : targetId;

        const baseReviewData = {
            noticeApprentice: { connect: { id: noticeApprenticeId } },
            project: { connect: { id: projectId } },
            target: { connect: { id: finalTargetId } },
            author: { connect: { id: authorId } },
            response: comment,
            rating
        };

        if (isGarageOwner) {
            baseReviewData.garage = { connect: { id: garageId } };
        }

        return await prisma.review.upsert({
            where: { noticeApprenticeId },
            create: baseReviewData,
            update: {
                ...(isGarageOwner && {
                    garage: { connect: { id: garageId } }
                }),
                response: comment,
                rating
            }
        });
    }
}

module.exports = new TransactionService();