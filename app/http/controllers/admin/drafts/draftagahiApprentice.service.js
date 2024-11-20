const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../utils/functions");

class ApprenticeshipNoticeService {
    // Private helper methods
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

    async validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
    }

    async processAttachments(files, fileUploadPath, correlationType) {
        const attachments = [];
        
        // Process images
        const images = ListOfImagesFromRequest(files || [], fileUploadPath);
        for (const image of images) {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
                url: image,
                filename: path.basename(image),
                fileType: 'image',
                fileSize: fileInfo?.size?.toString() || '0',
                mimeType: fileInfo?.mimetype || 'image/jpeg',
                dimensions: { width: 0, height: 0 },
                status: 'COMPLETED',
                CorrelationType: correlationType
            });
        }

        // Process voice and video files
        if (files?.voice?.length > 0) {
            const voiceFile = files.voice[0];
            const voiceAddress = path.join(fileUploadPath, voiceFile.filename).replace(/\\/g, "/");
            const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`;
            
            try {
                const seconds = await getAudioDurationInSeconds(voiceURL);
                attachments.push({
                    url: voiceAddress,
                    filename: voiceFile.filename,
                    fileType: 'audio',
                    fileSize: voiceFile.size.toString(),
                    mimeType: voiceFile.mimetype,
                    duration: getTime(seconds),
                    status: 'COMPLETED',
                    CorrelationType: correlationType
                });
            } catch (error) {
                console.error("Error processing audio file:", error);
            }
        }

        if (files?.video?.length > 0) {
            const videoFile = files.video[0];
            const videoAddress = path.join(fileUploadPath, videoFile.filename).replace(/\\/g, "/");
            
            try {
                attachments.push({
                    url: videoAddress,
                    filename: videoFile.filename,
                    fileType: 'video',
                    fileSize: videoFile.size.toString(),
                    mimeType: videoFile.mimetype,
                    status: 'COMPLETED',
                    CorrelationType: correlationType
                });
            } catch (error) {
                console.error("Error processing video file:", error);
            }
        }

        return attachments;
    }

    // Service methods for Apprentice Requests
    async createNewApprenticeRequest(user, body, params, files) {
        const garageId = await this.validateGarageOwnership(user);
        
        const attachments = await this.processAttachments(
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

        const newAttachments = await this.processAttachments(
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

    // Bookmark Services
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
            return false; // Bookmark removed
        }

        await prisma.bookmark.create({
            data: {
                userId,
                noticeApprenticeshipId: noticeApprenticeId
            }
        });
        return true; // Bookmark added
    }

    // Garage Notice Services
    async getAllGarageNoticeApprentices(user, page = 1, limit = 10) {
        const garageId = await this.validateGarageOwnership(user);

        const where = {
            publisherId: user.id,
            requesterGarageId: garageId
        };

        const [notices, total] = await prisma.$transaction([
            prisma.noticeApprenticeship.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    apprentice: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
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
            prisma.noticeApprenticeship.count({ where })
        ]);

        return { notices, total };
    }

    // Apprentice Request Services
    async getAllApprenticeRequestsToItself(apprenticeId, page = 1, limit = 10, status) {
        const where = { apprenticeId };
        if (status) where.status = status;

        const [requests, total] = await prisma.$transaction([
            prisma.shagerdReqsForApprenticeCoWork.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    noticeApprenticeship: {
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
            prisma.shagerdReqsForApprenticeCoWork.count({ where })
        ]);

        return { requests, total };
    }

    // Active Notice Services
    async getApprenticeAllActiveNotices(apprenticeId, page = 1, limit = 10) {
        const where = {
            apprenticeId,
            status: 'IN_PROGRESS',
            isAvailable: false
        };

        const [activeNotices, total] = await prisma.$transaction([
            prisma.noticeApprenticeship.findMany({
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
            prisma.noticeApprenticeship.count({ where })
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
            prisma.noticeApprenticeship.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    apprentice: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                            phone: true,
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
            prisma.noticeApprenticeship.count({ where })
        ]);

        return { activeNotices, total };
    }

    // Share Services
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

    // Cowork Request Services
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

    // Apprentice Management Services
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

    // Transaction Services
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

    // Complaint Services
    async createComplaint(transactionId, authorId, role, body, files) {
        const { description, fileUploadPath } = body;
        const attachments = await this.processAttachments(files, fileUploadPath, 'AUTHOR');

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
            throw createError(HttpStatus.NOT_FOUND, "شکایت مورد نظر یافت نشد");
        }

        if (complaint.authorId !== userId) {
            throw createError(HttpStatus.FORBIDDEN, "شما مجاز به لغو این شکایت نیستید");
        }

        if (complaint.status !== 'PENDING') {
            throw createError(HttpStatus.BAD_REQUEST, "فقط شکایت‌های در حال بررسی قابل لغو هستند");
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

        const attachments = await this.processAttachments(files, body.fileUploadPath, 'TARGET');

        return await prisma.complaint.update({
            where: { id: complaintId },
            data: {
                response: body.response,
                evidence: { create: attachments }
            },
            include: { evidence: true }
        });
    }

    // Review Services
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

    // Conversation Services
    async createTransactionRoom(transactionId, userId) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                project: {
                    select: {
                        requesterId: true,
                        providerId: true
                    }
                },
                conversation: true
            }
        });

        if (!transaction) {
            throw createError.NotFound("تراکنش مورد نظر یافت نشد");
        }

        if (userId !== transaction.project.requesterId && 
            userId !== transaction.project.providerId) {
            throw createError.Forbidden("شما مجاز به ایجاد اتاق گفتگو برای این تراکنش نیستید");
        }

        if (transaction.conversation) {
            throw createError.BadRequest("اتاق گفتگو قبلاً برای این تراکنش ایجاد شده است");
        }

        return await prisma.$transaction(async (prismaClient) => {
            const newConversation = await prismaClient.conversation.create({
                data: {
                    type: 'TRANSACTION',
                    name: `تراکنش ${transaction.id}`,
                    transaction: { connect: { id: transactionId } }
                }
            });

            const participants = await Promise.all([
                prismaClient.conversationParticipant.create({
                    data: {
                        conversationId: newConversation.id,
                        userId: transaction.project.requesterId,
                        role: 'MEMBER'
                    }
                }),
                prismaClient.conversationParticipant.create({
                    data: {
                        conversationId: newConversation.id,
                        userId: transaction.project.providerId,
                        role: 'MEMBER'
                    }
                })
            ]);

            await prismaClient.message.create({
                data: {
                    conversationId: newConversation.id,
                    senderId: participants[0].id,
                    type: 'SYSTEM',
                    content: 'به اتاق گفتگوی تراکنش خوش آمدید. شما می‌توانید در اینجا درباره جزئیات همکاری گفتگو کنید.'
                }
            });

            return newConversation;
        });
    }

    async sendMessage(conversationId, userId, body, files) {
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                participants: {
                    some: {
                        userId: userId,
                        isActive: true
                    }
                }
            },
            include: {
                participants: {
                    where: {
                        userId: userId
                    }
                }
            }
        });

        if (!conversation) {
            throw createError.NotFound("مکالمه مورد نظر یافت نشد یا شما به آن دسترسی ندارید");
        }

        const attachments = files?.length > 0 
            ? await this.processAttachments(files, body.fileUploadPath)
            : [];

        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId: conversation.participants[0].id,
                content: body.content,
                type: 'TEXT',
                attachments: { create: attachments }
            },
            include: {
                attachments: true,
                sender: {
                    include: {
                        user: true
                    }
                }
            }
        });

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() }
        });

        return message;
    }

    async getMessages(conversationId, userId, page = 1, limit = 20) {
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                participants: {
                    some: {
                        userId: userId,
                        isActive: true
                    }
                }
            }
        });

        if (!conversation) {
            throw createError.NotFound("مکالمه مورد نظر یافت نشد یا شما به آن دسترسی ندارید");
        }

        const skip = (page - 1) * limit;
        const [messages, totalMessages] = await prisma.$transaction([
            prisma.message.findMany({
                where: {
                    conversationId,
                    deletedAt: null
                },
                include: {
                    attachments: true,
                    sender: {
                        include: {
                            user: true
                        }
                    },
                    reactions: true,
                    readReceipts: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limit)
            }),
            prisma.message.count({
                where: {
                    conversationId,
                    deletedAt: null
                }
            })
        ]);

        return { messages, totalMessages };
    }

    async getUserConversations(userId, page = 1, limit = 10, status) {
        const skip = (page - 1) * limit;
        
        const where = {
            type: 'TRANSACTION',
            participants: {
                some: {
                    userId: userId,
                    isActive: true
                }
            }
        };

        if (status) {
            where.transaction = { status };
        }

        const [conversations, totalConversations] = await prisma.$transaction([
            prisma.conversation.findMany({
                where,
                include: {
                    transaction: {
                        include: {
                            project: {
                                include: {
                                    requester: {
                                        select: {
                                            id: true,
                                            name: true,
                                            avatar: true
                                        }
                                    },
                                    provider: {
                                        select: {
                                            id: true,
                                            name: true,
                                            avatar: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    participants: {
                        where: {
                            isActive: true
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    avatar: true
                                }
                            }
                        }
                    },
                    messages: {
                         orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1,
                        include: {
                            attachments: true
                        }
                    }
                },
                orderBy: {
                    lastMessageAt: 'desc'
                },
                skip,
                take: Number(limit)
            }),
            prisma.conversation.count({ where })
        ]);

        return {
            conversations: conversations.map(conv => ({
                id: conv.id,
                transactionId: conv.transaction.id,
                transactionStatus: conv.transaction.status,
                name: conv.name,
                otherParty: conv.participants.find(p => p.userId !== userId)?.user,
                lastMessage: conv.messages[0] ? {
                    content: conv.messages[0].content,
                    type: conv.messages[0].type,
                    createdAt: conv.messages[0].createdAt,
                    hasAttachments: conv.messages[0].attachments.length > 0
                } : null,
                unreadCount: 0,
                lastMessageAt: conv.lastMessageAt
            })),
            totalConversations
        };
    }

    async markMessagesAsRead(conversationId, userId) {
        const unreadMessages = await prisma.message.findMany({
            where: {
                conversationId,
                sender: {
                    user: {
                        id: {
                            not: userId
                        }
                    }
                },
                readReceipts: {
                    none: {
                        userId
                    }
                }
            }
        });

        if (unreadMessages.length === 0) {
            return { count: 0 };
        }

        await prisma.$transaction(
            unreadMessages.map(message =>
                prisma.messageReadReceipt.create({
                    data: {
                        messageId: message.id,
                        userId: userId
                    }
                })
            )
        );

        return { count: unreadMessages.length };
    }

    async getConversationDetails(conversationId, userId) {
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                type: 'TRANSACTION',
                participants: {
                    some: {
                        userId,
                        isActive: true
                    }
                }
            },
            include: {
                transaction: {
                    include: {
                        project: {
                            include: {
                                requester: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatar: true
                                    }
                                },
                                provider: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatar: true
                                    }
                                }
                            }
                        }
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        if (!conversation) {
            throw createError.NotFound("گفتگوی مورد نظر یافت نشد");
        }

        const unreadCount = await prisma.message.count({
            where: {
                conversationId,
                sender: {
                    user: {
                        id: {
                            not: userId
                        }
                    }
                },
                readReceipts: {
                    none: {
                        userId
                    }
                }
            }
        });

        return {
            id: conversation.id,
            name: conversation.name,
            type: conversation.type,
            transaction: {
                id: conversation.transaction.id,
                status: conversation.transaction.status,
                project: conversation.transaction.project
            },
            participants: conversation.participants.map(p => ({
                id: p.user.id,
                name: p.user.name,
                avatar: p.user.avatar,
                role: p.role,
                lastReadAt: p.lastReadAt
            })),
            unreadCount,
            createdAt: conversation.createdAt,
            lastMessageAt: conversation.lastMessageAt
        };
    }
}

module.exports = new ApprenticeshipNoticeService();