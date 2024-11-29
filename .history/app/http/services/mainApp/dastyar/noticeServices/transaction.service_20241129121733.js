const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Shared configuration for different notice types
const NOTICE_CONFIG = {
    APPRENTICE: {
        model: 'noticeApprentice',
        partnerType: 'apprentice',
        partnerId: 'apprenticeId',
        partnerRole: 'apprentice',
        requesterRole: 'garage',
        getPartnerInfo: (notice) => notice.apprentice,
        getRequesterInfo: (notice) => notice.requesterGarage.garageOwner
    },
    DASTYAR: {
        model: 'noticeDastyar',
        partnerType: 'mechanic',
        partnerId: 'mechanicId',
        partnerRole: 'mechanic',
        requesterRole: 'garage',
        getPartnerInfo: (notice) => notice.mechanic,
        getRequesterInfo: (notice) => notice.requesterGarage.garageOwner
    },
    OUTSOURCING: {
        model: 'noticeOutsourcing',
        partnerType: 'acceptorGarage',
        partnerId: 'acceptorGarageId',
        partnerRole: 'acceptorGarage',
        requesterRole: 'requesterGarage',
        getPartnerInfo: (notice) => notice.acceptorGarage.garageOwner,
        getRequesterInfo: (notice) => notice.requesterGarage.garageOwner
    }
};

class BaseTransactionService {
    constructor(noticeType) {
        this.config = NOTICE_CONFIG[noticeType];
        if (!this.config) {
            throw new Error(`Invalid notice type: ${noticeType}`);
        }
    }

    async validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                [this.config.model]: {
                    select: {
                        [this.config.partnerId]: true,
                        publisherId: true
                    }
                }
            }
        });

        if (!transaction) throw createError.NotFound("Transaction not found");

        const isOwner = role === this.config.partnerRole
            ? transaction[this.config.model][this.config.partnerId] === userId
            : transaction[this.config.model].publisherId === userId;

        if (!isOwner) throw createError.Unauthorized("Not authorized to perform this action");

        return transaction;
    }
/////////////////////////////////////////////////////////////////

    async confirmTransactionCompletion(transactionId, userId, role) {
        await this.validateTransactionOwnership(transactionId, userId, role);

        const updateData = role === this.config.partnerRole
            ? { providerConfirmedCompletion: true, providerConfirmedPayment: true }
            : { requesterConfirmedCompletion: true, requesterConfirmedPayment: true };

        return await prisma.transaction.update({
            where: { id: transactionId },
            data: updateData
        });
    }

    async addReview(user, noticeId, body) {
        const { comment, rating, projectId, targetId } = body;
        const { id: authorId, ownedGarage } = user;
        const partnerId = body[this.config.partnerId];
        
        const isGarageOwner = !!ownedGarage;
        const garageId = ownedGarage?.id;
        const finalTargetId = isGarageOwner ? partnerId : targetId;

        const baseReviewData = {
            [this.config.model]: { connect: { id: noticeId } },
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
            where: { [`${this.config.model}Id`]: noticeId },
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


// Create service instances for each notice type
const transactionServices = {
    apprentice: new BaseTransactionService('APPRENTICE'),
    dastyar: new BaseTransactionService('DASTYAR'),
    outsourcing: new BaseTransactionService('OUTSOURCING')
};



module.exports = {
    transactionServices,
};