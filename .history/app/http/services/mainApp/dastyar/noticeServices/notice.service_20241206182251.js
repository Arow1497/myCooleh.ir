const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {AttachmentProcessor} = require('../../../generalServices/attachmentProcess');
const noticeSchema = require("../../../../validators/MainApp/transactionNotices.scheema");
const processor = new AttachmentProcessor();

// Configuration for different notice types
const NOTICE_TYPES = {
    APPRENTICE: {
        model: 'noticeApprenticeship',
        partnerType: 'apprentice',
        partnerId: 'apprenticeId',
        defaultFileId: 'DEFAULT_NOTICEAPPRENTICESHIP_ID',
        partnerSelect: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            rating: true
        }
    },
    DASTYAR: {
        model: 'noticeDastyar',
        partnerType: 'mechanic',
        partnerId: 'mechanicId',
        defaultFileId: 'DEFAULT_NOTICEDASTYAR_ID',
        partnerSelect: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            rating: true
        }
    },
    OUTSOURCING: {
        model: 'noticeOutsourcing',
        partnerType: 'acceptorGarage',
        partnerId: 'acceptorGarageId',
        defaultFileId: 'DEFAULT_NOTICEOUTSOURCING_ID',
        partnerSelect: {
            id: true,
            name: true,
            address: true,
            rating: true
        }
    }
};
/*******************************************************************/
class BaseNoticeService {
    constructor(noticeType) {
        this.config = NOTICE_TYPES[noticeType];
        if (!this.config) {
            throw new Error(`Invalid notice type: ${noticeType}`);
        }
        this.model = prisma[this.config.model];
    }

    // Private Handlers
    async validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
    }
/******************************************************************/
    async createNewRequest(user, body, params, files) {
        // await this.validateGarageOwnership(user);
        const attachments = await processor.processAttachments(
            files, 
            body.fileUploadPath,
            process.env[this.config.defaultFileId]
        );
        const {title, description, city, budget, expertices} = body;
        const result = await prisma.$transaction(async (prisma) => {
            const notice = await this.model.create({
                data: {
                    title,
                    description,
                    city,
                    budget,
                    expertices,
                    publisher: { connect: { id: user.id } },
                    project: { connect: { id: params.projectId } },
                    attachments: { create: attachments }
                },
                include: { attachments: true }
            });

            const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(user)}`;
            const share = await prisma.share.create({
                data: {
                    shareUrl,
                    [this.config.model]: { connect: { id: notice.id } }
                }
            });

            return { notice, share };
        });

        return result;
    }

    async getAllNotices(city) {
        return await this.model.findMany({
            where: { city },
            include: {
                publisher: {
                    select: { name: true, avatar: true }
                },
                requesterGarage: {
                    select: { name: true, address: true }
                }
            }
        });
    }

    async getOneNoticeById(noticeId) {
        const notice = await this.model.findUnique({
            where: { id: noticeId },
            include: {
                publisher: true,
                requesterGarage: true,
                attachments: true,
                share: true
            }
        });

        if (!notice) {
            throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
        }

        return notice;
    }

    async removeRequestById(noticeId, userId) {
        const notice = await this.model.findUnique({
            where: { id: noticeId },
            select: { publisherId: true }
        });

        if (!notice) {
            throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
        }

        if (notice.publisherId !== userId) {
            throw createError(HttpStatus.FORBIDDEN, "شما مجاز به حذف این آگهی نیستید");
        }

        await this.model.delete({
            where: { id: noticeId }
        });
    }

    async editRequestById(noticeId, userId, body, files) {
        const notice = await this.model.findUnique({
            where: { id: noticeId },
            include: { attachments: true }
        });

        if (!notice) {
            throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
        }

        if (notice.publisherId !== userId) {
            throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش این آگهی نیستید");
        }

        const attachmentsToDelete = Array.isArray(body.attachmentsToDelete) 
            ? body.attachmentsToDelete 
            : [];

        const newAttachments = await processor.processAttachments(
            files,
            body.fileUploadPath,
            process.env[this.config.defaultFileId]
        );

        const updateData = { ...body };
        delete updateData.id;
        delete updateData.publisherId;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.bookmarks;
        delete updateData.conversation;
        delete updateData.transaction;
        delete updateData.milestones;
        delete updateData.reviews;
        delete updateData.transactionsActivityLogs;
        delete updateData.share;

        return await this.model.update({
            where: { id: noticeId },
            data: {
                ...updateData,
                attachments: {
                    deleteMany: attachmentsToDelete.length > 0 
                        ? { id: { in: attachmentsToDelete } }
                        : undefined,
                    create: newAttachments
                }
            }
        });
    }

    async toggleBookmark(noticeId, userId) {
        const bookmark = await prisma.bookmark.findFirst({
            where: {
                userId,
                [`${this.config.model}Id`]: noticeId
            }
        });

        if (bookmark) {
            await prisma.bookmark.delete({
                where: { id: bookmark.id }
            });
            return false;
        }

        await prisma.bookmark.create({
            data: {
                userId,
                [`${this.config.model}Id`]: noticeId
            }
        });
        return true;
    }

    async getAllGarageNotices(user, page = 1, limit = 10) {
        const garageId = await this.validateGarageOwnership(user);

        const where = {
            publisherId: user.id,
            requesterGarageId: garageId
        };

        const [notices, total] = await prisma.$transaction([
            this.model.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    [this.config.partnerType]: {
                        select: this.config.partnerSelect
                    },
                    project: {
                        select: {
                            title: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            this.model.count({ where })
        ]);

        return { notices, total };
    }

    async getAllPartnerRequests(partnerId, city, page = 1, limit = 10, status) {
        const where = { 
            [this.config.partnerId]: partnerId, 
            city 
        };
        if (status) where.status = status;

        const [requests, total] = await prisma.$transaction([
            prisma[`${this.config.model}Request`].findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    [this.config.model]: {
                        include: {
                            requesterGarage: {
                                select: {
                                    name: true,
                                    address: true,
                                    rating: true
                                }
                            },
                            project: {
                                select: {
                                    title: true,
                                    status: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma[`${this.config.model}Request`].count({ where })
        ]);

        return { requests, total };
    }

    async getPartnerAllActiveNotices(partnerId, page = 1, limit = 10) {
        const where = {
            [this.config.partnerId]: partnerId,
            status: 'IN_PROGRESS',
            isAvailable: false
        };

        const [activeNotices, total] = await prisma.$transaction([
            this.model.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    requesterGarage: {
                        select: {
                            name: true,
                            address: true,
                            rating: true
                        }
                    },
                    project: {
                        select: {
                            title: true,
                            status: true,
                            startedAt: true,
                            expectedDuration: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' }
            }),
            this.model.count({ where })
        ]);

        return { activeNotices, total };
    }

    async getGarageAllActiveNotices(user, page = 1, limit = 10) {
        const garageId = await this.validateGarageOwnership(user);

        const where = {
            publisherId: user.id,
            requesterGarageId: garageId,
            status: 'IN_PROGRESS',
            isAvailable: true
        };

        const [activeNotices, total] = await prisma.$transaction([
            this.model.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    [this.config.partnerType]: {
                        select: this.config.partnerSelect
                    },
                    project: {
                        select: {
                            title: true,
                            status: true,
                            startedAt: true,
                            expectedDuration: true
                        }
                    },
                    milestones: {
                        where: { status: 'IN_PROGRESS' },
                        select: {
                            title: true,
                            dueDate: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' }
            }),
            this.model.count({ where })
        ]);

        return { activeNotices, total };
    }

    async shareRequest(noticeId, user) {
        const notice = await this.model.findUnique({
            where: { id: noticeId },
            select: {
                share: {
                    select: {
                        id: true,
                        shareUrl: true,
                        createdAt: true
                    }
                },
                title: true,
                status: true,
                isAvailable: true
            }
        });

        if (!notice) {
            throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
        }

        if (!notice.isAvailable) {
            throw createError(HttpStatus.BAD_REQUEST, "این آگهی در حال حاضر قابل اشتراک‌گذاری نیست");
        }

        if (!notice.share?.length) {
            const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(user)}`;
            const share = await prisma.share.create({
                data: {
                    shareUrl,
                    [this.config.model]: { connect: { id: noticeId } }
                }
            });

            notice.share = [share];
        }

        return notice.share[0];
    }
}

// Create specific service instances
const apprenticeNoticeService = new BaseNoticeService('APPRENTICE');
const dastyarNoticeService = new BaseNoticeService('DASTYAR');
const outsourcingNoticeService = new BaseNoticeService('OUTSOURCING');

module.exports = {
    apprenticeNoticeService,
    dastyarNoticeService, 
    outsourcingNoticeService
};