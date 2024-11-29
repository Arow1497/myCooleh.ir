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

class BaseCoworkService {
    constructor(collaborationType) {
        this.config = COLLABORATION_CONFIG[collaborationType];
        if (!this.config) {
            throw new Error(`Invalid collaboration type: ${collaborationType}`);
        }
    }

    async addCoworkRequest(user, noticeId, collaboratorId) {
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

    async showCoworkRequests(ownedGarageId) {
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
const coworkService = {
    apprentice: new BaseCoworkService('APPRENTICE'),
    dastyar: new BaseCoworkService('DASTYAR'),
    outsourcing: new BaseCoworkService('OUTSOURCING')
};

module.exports = {
    coworkService
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