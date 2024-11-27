const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { processAttachments } = require("../../../../../utils/functions");


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

class BaseComplaintService {
    constructor(noticeType) {
        this.config = NOTICE_CONFIG[noticeType];
        if (!this.config) {
            throw new Error(`Invalid notice type: ${noticeType}`);
        }
    }

    async createComplaint(transactionId, authorId, role, body, files) {
        const { description, fileUploadPath } = body;
        const attachments = await processAttachments(files, fileUploadPath, 'AUTHOR');

        const isRequester = role === this.config.requesterRole;
        
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                [this.config.model]: {
                    select: isRequester ? {
                        [this.config.partnerType]: {
                            select: { id: true }
                        }
                    } : {
                        requesterGarage: {
                            select: {
                                garageOwner: {
                                    select: { id: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const targetId = isRequester
            ? this.config.getPartnerInfo(transaction[this.config.model]).id
            : this.config.getRequesterInfo(transaction[this.config.model]).id;

        return await prisma.complaint.create({
            data: {
                transaction: { connect: { id: transactionId } },
                author: { connect: { id: authorId } },
                target: { connect: { id: targetId } },
                description,
                evidence: { create: attachments }
            },
            include: { evidence: true }
        });
    }

    async removeComplaint(complaintId, userId) {
        const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId },
            include: { transaction: true }
        });

        if (!complaint) {
            throw createError.NotFound("شکایت مورد نظر یافت نشد");
        }

        if (complaint.authorId !== userId) {
            throw createError.Forbidden("شما مجاز به لغو این شکایت نیستید");
        }

        if (complaint.status !== 'PENDING') {
            throw createError.BadRequest("فقط شکایت‌های در حال بررسی قابل لغو هستند");
        }

        await prisma.$transaction([
            prisma.transactionsActivityLog.create({
                data: {
                    transaction: { connect: { id: complaint.transactionId } },
                    complaint: { connect: { id: complaintId } },
                    activityType: 'COMPLAINT_CANCELLED',
                    description: 'شکایت توسط ثبت کننده لغو شد',
                    performedById: userId
                }
            }),
            prisma.complaint.delete({
                where: { id: complaintId }
            })
        ]);
    }

    async respondToComplaint(complaintId, responderId, body, files) {
        const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId }
        });

        if (!complaint) {
            throw createError.NotFound("Complaint not found");
        }

        if (responderId !== complaint.targetId) {
            throw createError.Unauthorized("Only the complaint target can respond");
        }

        const attachments = await processAttachments(files, body.fileUploadPath, 'TARGET');

        return await prisma.complaint.update({
            where: { id: complaintId },
            data: {
                response: body.response,
                evidence: { create: attachments }
            },
            include: { evidence: true }
        });
    }
}

const complaintServices = {
    apprentice: new BaseComplaintService('APPRENTICE'),
    dastyar: new BaseComplaintService('DASTYAR'),
    outsourcing: new BaseComplaintService('OUTSOURCING')
};

module.exports = {
    complaintServices
};