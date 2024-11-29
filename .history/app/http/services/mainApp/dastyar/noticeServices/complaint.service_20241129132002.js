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
        this.model = prisma[this.config.model];
    }

    async createComplaint(transactionId, authorId, role, body, files) {
        const { description, fileUploadPath } = body;
        const attachments = await processAttachments(files, fileUploadPath, 'AUTHOR');

        const isRequester = role === this.config.requesterRole;
        
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                [this.model]: {
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
            ? this.config.getPartnerInfo(transaction[this.model]).id
            : this.config.getRequesterInfo(transaction[this.model]).id;

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

/*

برای پاسخ به سوال شما، بیایید نگاهی دقیق‌تر به کد بیندازیم. راه حل شما با استفاده از 
NOTICE_CONFIG و BaseComplaintService بسیار هوشمندانه است.
در این پیاده‌سازی، شما از یک آبجکت NOTICE_CONFIG استفاده کرده‌اید که تنظیمات مختلف برای هر نوع اگهی را تعریف می‌کند.
 هر نوع اگهی (APPRENTICE, DASTYAR, OUTSOURCING) یک تنظیمات خاص خود را دارد که شامل:

مدل مرتبط با Prisma
نوع شریک
شناسه شریک
نقش شریک
نقش درخواست‌کننده
متدهای دریافت اطلاعات شریک و درخواست‌کننده

در کانستراکتور BaseComplaintService، متد زیر این تعیین نوع را انجام می‌دهد:
javascriptCopyconstructor(noticeType) {
    this.config = NOTICE_CONFIG[noticeType];
    if (!this.config) {
        throw new Error(`Invalid notice type: ${noticeType}`);
    }
}
هنگام ایجاد سرویس‌های شکایت، شما سه نمونه از این سرویس را با نوع مختلف می‌سازید:
javascriptCopyconst complaintServices = {
    apprentice: new BaseComplaintService('APPRENTICE'),
    dastyar: new BaseComplaintService('DASTYAR'),
    outsourcing: new BaseComplaintService('OUTSOURCING')
};
در زمان کال کردن سرویس (مثلاً در کنترلر)، شما دقیقاً مشخص می‌کنید که می‌خواهید از کدام سرویس استفاده کنید:
javascriptCopy// مثال
complaintServices.apprentice.createComplaint(...)
یا
complaintServices.dastyar.createComplaint(...)
مکانیزم تشخیص نوع اگهی در متدهایی مثل createComplaint با
 استفاده از this.config اتفاق می‌افتد. برای مثال در createComplaint:

از this.config.model برای انتخاب مدل صحیح استفاده می‌شود
this.config.getPartnerInfo و this.config.getRequesterInfo برای دریافت اطلاعات مناسب

این رویکرد باعث می‌شود:

کد تکراری کاهش یابد
افزودن نوع جدید اگهی راحت‌تر شود
منطق مشترک در یک کلاس پایه نگهداری شود

به این ترتیب، سرویس دقیقاً می‌داند که با کدام نوع اگهی کار می‌کند، بدون نیاز به شرط‌های اضافی یا کدهای تکراری.
*/