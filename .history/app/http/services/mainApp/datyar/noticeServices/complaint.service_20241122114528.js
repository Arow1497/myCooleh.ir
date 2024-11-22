const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { processAttachments } = require("../../../../../utils/functions");

class ComplaintService {
    async createComplaint(transactionId, authorId, role, body, files) {
        const { description, fileUploadPath } = body;
        const attachments = await processAttachments(files, fileUploadPath, 'AUTHOR');

        const isGarage = role === 'GARAGE';
        
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                noticeApprentice: {
                    select: isGarage ? {
                        apprentice: {
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

        const targetId = isGarage 
            ? transaction.noticeApprentice.apprentice.id
            : transaction.noticeApprentice.requesterGarage.garageOwner.id;

        return await prisma.complaint.create({
            data: {
                transaction: { connect: { id: transactionId } },
                author: { connect: { id: authorId } },
                target: { connect: { id: targetId } },
                description,
                evidence: { create: attachments }
            },
            include: { attachments: true }
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

module.exports = new ComplaintService();