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
        this.model = prisma[this.config.model];

    }

    async validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                [this.model]: {
                    select: {
                        [this.config.partnerId]: true,
                        publisherId: true
                    }
                }
            }
        });

        if (!transaction) throw createError.NotFound("Transaction not found");

        const isOwner = role === this.config.partnerRole
            ? transaction[this.model][this.config.partnerId] === userId
            : transaction[this.model].publisherId === userId;

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
            [this.model]: { connect: { id: noticeId } },
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
            where: { [`${this.model}Id`]: noticeId },
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
    transactionServices
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