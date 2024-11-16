const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { processAttachments } = require("../utils/functions");

class NoticeService {
    async validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
    }

    async createNewApprenticeRequest(user, body, params, files) {
        const garageId = await this.validateGarageOwnership(user);
        
        const attachments = await processAttachments(
            files, 
            body.fileUploadPath,
            process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID
        );

        const result = await prisma.$transaction(async (prisma) => {
            const notice = await prisma.noticeApprenticeship.create({
                data: {
                    ...body,
                    publisher: { connect: { id: user.id } },
                    requesterGarage: { connect: { id: garageId } },
                    project: { connect: { id: params.projectId } },
                    attachments: { create: attachments }
                },
                include: { attachments: true }
            });

            const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(user)}`;
            const share = await prisma.share.create({
                data: {
                    shareUrl,
                    noticeApprentice: { connect: { id: notice.id } }
                }
            });

            return { notice, share };
        });

        return result;
    }

    async getAllNoticeApprentice(city) {
        return await prisma.noticeApprenticeship.findMany({
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

    async getOneNoticeApprenticeById(noticeApprenticeId) {
        const notice = await prisma.noticeApprenticeship.findUnique({
            where: { id: noticeApprenticeId },
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

    async removeApprenticeRequestById(noticeApprenticeId, userId) {
        const notice = await prisma.noticeApprenticeship.findUnique({
            where: { id: noticeApprenticeId },
            select: { publisherId: true }
        });

        if (!notice) {
            throw createError(HttpStatus.NOT_FOUND, "آگهی مورد نظر یافت نشد");
        }

        if (notice.publisherId !== userId) {
            throw createError(HttpStatus.FORBIDDEN, "شما مجاز به حذف این آگهی نیستید");
        }

        await prisma.noticeApprenticeship.delete({
            where: { id: noticeApprenticeId }
        });
    }

    async editApprenticeRequestsById(noticeApprenticeId, userId, body, files) {
        const notice = await prisma.noticeApprenticeship.findUnique({
            where: { id: noticeApprenticeId },
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

        const newAttachments = await processAttachments(
            files,
            body.fileUploadPath,
            process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID
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

        return await prisma.noticeApprenticeship.update({
            where: { id: noticeApprenticeId },
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

    async toggleBookmark(noticeApprenticeId, userId) {
        const bookmark = await prisma.bookmark.findFirst({
            where: {
                userId,
                noticeApprenticeshipId: noticeApprenticeId
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
                noticeApprenticeshipId: noticeApprenticeId
            }
        });
        return true;
    }

    async shareApprenticeRequest(noticeApprenticeId, user) {
        const notice = await prisma.noticeApprenticeship.findUnique({
            where: { id: noticeApprenticeId },
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
                    noticeApprentice: { connect: { id: noticeApprenticeId } }
                }
            });

            notice.share = [share];
        }

        return notice.share[0];
    }
}

module.exports = new NoticeService();