// فضای گفتگوی برای گفتگوی ادمین ها با کاربران هم ایجاد کن

const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { StatusCodes } = require('http-status-codes');

class ConversationController extends Controller {
    async createDirectConversation(req, res, next) {
        try {
            const { targetUserId } = req.body;
            const initiatorId = req.user.id;

            // Check if users exist
            const [initiator, target] = await Promise.all([
                prisma.user.findUnique({ where: { id: initiatorId } }),
                prisma.user.findUnique({ where: { id: targetUserId } })
            ]);

            if (!initiator || !target) {
                throw createHttpError.NotFound('One or both users not found');
            }

            // Check if conversation already exists
            const existingConversation = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        { type: 'DIRECT' },
                        {
                            participants: {
                                every: {
                                    userId: {
                                        in: [initiatorId, targetUserId]
                                    }
                                }
                            }
                        }
                    ]
                },
                include: {
                    participants: true
                }
            });

            if (existingConversation) {
                return this.success(res, {
                    statusCode: StatusCodes.OK,
                    data: existingConversation
                });
            }

            // Create new conversation
            const conversation = await prisma.$transaction(async (prisma) => {
                const newConversation = await prisma.conversation.create({
                    data: {
                        type: 'DIRECT'
                    }
                });

                // Add participants
                const participants = await Promise.all([
                    prisma.conversationParticipant.create({
                        data: {
                            conversationId: newConversation.id,
                            userId: initiatorId,
                            role: 'MEMBER'
                        }
                    }),
                    prisma.conversationParticipant.create({
                        data: {
                            conversationId: newConversation.id,
                            userId: targetUserId,
                            role: 'MEMBER'
                        }
                    })
                ]);

                return { ...newConversation, participants };
            });

            return this.success(res, {
                statusCode: StatusCodes.CREATED,
                data: conversation
            });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req, res, next) {
        try {
            const { conversationId, content, type = 'TEXT', replyToId } = req.body;
            const senderId = req.user.id;

            // Check if conversation exists and user is participant
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    participants: {
                        where: { userId: senderId }
                    }
                }
            });

            if (!conversation) {
                throw createHttpError.NotFound('Conversation not found');
            }

            if (!conversation.participants.length) {
                throw createHttpError.Forbidden('You are not a participant in this conversation');
            }

            // If it's a reply, verify the original message exists
            if (replyToId) {
                const originalMessage = await prisma.message.findUnique({
                    where: { id: replyToId }
                });
                if (!originalMessage) {
                    throw createHttpError.NotFound('Original message not found');
                }
            }

            // Create message
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderId: conversation.participants[0].id,
                    content,
                    type,
                    replyToId,
                    status: 'SENT'
                },
                include: {
                    sender: true,
                    replyTo: true
                }
            });

            // Update conversation's lastMessageAt
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });

            return this.success(res, {
                statusCode: StatusCodes.CREATED,
                data: message
            });
        } catch (error) {
            next(error);
        }
    }

    async getConversations(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const conversations = await prisma.conversation.findMany({
                where: {
                    participants: {
                        some: {
                            userId: userId
                        }
                    }
                },
                include: {
                    participants: {
                        include: {
                            user: true
                        }
                    },
                    messages: {
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    lastMessageAt: 'desc'
                },
                skip,
                take: Number(limit)
            });

            const total = await prisma.conversation.count({
                where: {
                    participants: {
                        some: {
                            userId: userId
                        }
                    }
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: {
                    conversations,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getConversationMessages(req, res, next) {
        try {
            const { conversationId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const userId = req.user.id;
            const skip = (page - 1) * limit;

            // Verify user is participant
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId
                }
            });

            if (!participant) {
                throw createHttpError.Forbidden('You are not a participant in this conversation');
            }

            const messages = await prisma.message.findMany({
                where: {
                    conversationId
                },
                include: {
                    sender: true,
                    attachments: true,
                    replyTo: true,
                    reactions: true,
                    readReceipts: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limit)
            });

            const total = await prisma.message.count({
                where: {
                    conversationId
                }
            });

            // Mark messages as read
            await prisma.messageReadReceipt.createMany({
                data: messages.map(message => ({
                    messageId: message.id,
                    userId: userId
                })),
                skipDuplicates: true
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: {
                    messages,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async addParticipants(req, res, next) {
        try {
            const { conversationId } = req.params;
            const { userIds } = req.body;
            const requesterId = req.user.id;

            // Verify conversation exists and requester is admin/owner
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    participants: true
                }
            });

            if (!conversation) {
                throw createHttpError.NotFound('Conversation not found');
            }

            const requesterParticipant = conversation.participants.find(p => p.userId === requesterId);
            if (!requesterParticipant || !['OWNER', 'ADMIN'].includes(requesterParticipant.role)) {
                throw createHttpError.Forbidden('Only conversation owners and admins can add participants');
            }

            // Add new participants
            const newParticipants = await prisma.$transaction(
                userIds.map(userId =>
                    prisma.conversationParticipant.create({
                        data: {
                            conversationId,
                            userId,
                            role: 'MEMBER'
                        }
                    })
                )
            );

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: newParticipants
            });
        } catch (error) {
            next(error);
        }
    }

    async removeParticipant(req, res, next) {
        try {
            const { conversationId, participantId } = req.params;
            const requesterId = req.user.id;

            // Verify conversation exists and requester is admin/owner
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    participants: true
                }
            });

            if (!conversation) {
                throw createHttpError.NotFound('Conversation not found');
            }

            const requesterParticipant = conversation.participants.find(p => p.userId === requesterId);
            if (!requesterParticipant || !['OWNER', 'ADMIN'].includes(requesterParticipant.role)) {
                throw createHttpError.Forbidden('Only conversation owners and admins can remove participants');
            }

            // Remove participant
            await prisma.conversationParticipant.update({
                where: {
                    id: participantId
                },
                data: {
                    isActive: false,
                    leftAt: new Date()
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: 'Participant removed successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    async addReaction(req, res, next) {
        try {
            const { messageId } = req.params;
            const { emoji } = req.body;
            const userId = req.user.id;

            const message = await prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    conversation: {
                        include: {
                            participants: true
                        }
                    }
                }
            });

            if (!message) {
                throw createHttpError.NotFound('Message not found');
            }

            // Verify user is participant
            if (!message.conversation.participants.some(p => p.userId === userId)) {
                throw createHttpError.Forbidden('You are not a participant in this conversation');
            }

            const reaction = await prisma.messageReaction.create({
                data: {
                    messageId,
                    userId,
                    emoji
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.CREATED,
                data: reaction
            });
        } catch (error) {
            next(error);
        }
    }

    async removeReaction(req, res, next) {
        try {
            const { messageId, reactionId } = req.params;
            const userId = req.user.id;

            const reaction = await prisma.messageReaction.findUnique({
                where: { id: reactionId }
            });

            if (!reaction || reaction.messageId !== messageId) {
                throw createHttpError.NotFound('Reaction not found');
            }

            if (reaction.userId !== userId) {
                throw createHttpError.Forbidden('You can only remove your own reactions');
            }

            await prisma.messageReaction.delete({
                where: { id: reactionId }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: 'Reaction removed successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    async uploadAttachment(req, res, next) {
        try {
            const { conversationId, messageId } = req.params;
            const { filename, fileType, fileSize, mimeType, url } = req.body;
            const userId = req.user.id;

            // Verify conversation participant
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId,
                    isActive: true
                }
            });

            if (!participant) {
                throw createHttpError.Forbidden('You are not a participant in this conversation');
            }

            const attachment = await prisma.attachment.create({
                data: {
                    url,
                    filename,
                    fileType,
                    fileSize,
                    mimeType,
                    status: 'PENDING',
                    messageId,
                    // اگر فایل تصویر یا ویدیو است
                    ...(fileType === 'IMAGE' || fileType === 'VIDEO' ? {
                        dimensions: req.body.dimensions
                    } : {}),
                    // اگر فایل صوتی یا ویدیو است
                    ...(fileType === 'AUDIO' || fileType === 'VIDEO' ? {
                        duration: req.body.duration
                    } : {})
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.CREATED,
                data: attachment
            });
        } catch (error) {
            next(error);
        }
    }

    async editMessage(req, res, next) {
        try {
            const { messageId } = req.params;
            const { content } = req.body;
            const userId = req.user.id;

            const message = await prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    sender: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (!message) {
                throw createHttpError.NotFound('Message not found');
            }

            if (message.sender.userId !== userId) {
                throw createHttpError.Forbidden('You can only edit your own messages');
            }

            const updatedMessage = await prisma.message.update({
                where: { id: messageId },
                data: {
                    content,
                    isEdited: true,
                    editedAt: new Date()
                },
                include: {
                    sender: true,
                    attachments: true,
                    reactions: true
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: updatedMessage
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteMessage(req, res, next) {
        try {
            const { messageId } = req.params;
            const userId = req.user.id;

            const message = await prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    sender: {
                        include: {
                            user: true
                        }
                    },
                    conversation: {
                        include: {
                            participants: true
                        }
                    }
                }
            });

            if (!message) {
                throw createHttpError.NotFound('Message not found');
            }

            // چک کردن دسترسی برای حذف پیام
            const isMessageOwner = message.sender.userId === userId;
            const isConversationAdmin = message.conversation.participants.some(
                p => p.userId === userId && ['OWNER', 'ADMIN'].includes(p.role)
            );

            if (!isMessageOwner && !isConversationAdmin) {
                throw createHttpError.Forbidden('You do not have permission to delete this message');
            }

            await prisma.message.update({
                where: { id: messageId },
                data: {
                    deletedAt: new Date()
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: 'Message deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    async updateParticipantSettings(req, res, next) {
        try {
            const { conversationId } = req.params;
            const { isMuted, mutedUntil, nickName, settings } = req.body;
            const userId = req.user.id;

            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId,
                    isActive: true
                }
            });

            if (!participant) {
                throw createHttpError.NotFound('Participant not found');
            }

            const updatedParticipant = await prisma.conversationParticipant.update({
                where: {
                    id: participant.id
                },
                data: {
                    isMuted: isMuted ?? participant.isMuted,
                    mutedUntil: mutedUntil ?? participant.mutedUntil,
                    nickName: nickName ?? participant.nickName,
                    settings: settings ? {
                        ...participant.settings,
                        ...settings
                    } : participant.settings
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: updatedParticipant
            });
        } catch (error) {
            next(error);
        }
    }

    async markConversationAsRead(req, res, next) {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;

            // Get all unread messages in the conversation
            const unreadMessages = await prisma.message.findMany({
                where: {
                    conversationId,
                    sender: {
                        userId: {
                            not: userId
                        }
                    },
                    readReceipts: {
                        none: {
                            userId
                        }
                    }
                }
            });

            // Create read receipts for all unread messages
            if (unreadMessages.length > 0) {
                await prisma.messageReadReceipt.createMany({
                    data: unreadMessages.map(message => ({
                        messageId: message.id,
                        userId
                    }))
                });
            }

            // Update participant's lastReadAt
            await prisma.conversationParticipant.updateMany({
                where: {
                    conversationId,
                    userId
                },
                data: {
                    lastReadAt: new Date()
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                message: 'Conversation marked as read'
            });
        } catch (error) {
            next(error);
        }
    }

    async getUnreadCount(req, res, next) {
        try {
            const userId = req.user.id;

            const conversations = await prisma.conversation.findMany({
                where: {
                    participants: {
                        some: {
                            userId,
                            isActive: true
                        }
                    }
                },
                include: {
                    messages: {
                        where: {
                            sender: {
                                userId: {
                                    not: userId
                                }
                            },
                            readReceipts: {
                                none: {
                                    userId
                                }
                            }
                        }
                    }
                }
            });

            const unreadCounts = conversations.map(conv => ({
                conversationId: conv.id,
                unreadCount: conv.messages.length
            }));

            const totalUnread = unreadCounts.reduce((sum, conv) => sum + conv.unreadCount, 0);

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: {
                    total: totalUnread,
                    byConversation: unreadCounts
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateConversationSettings(req, res, next) {
        try {
            const { conversationId } = req.params;
            const { name, metadata } = req.body;
            const userId = req.user.id;

            // Verify user is admin/owner
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId,
                    role: {
                        in: ['OWNER', 'ADMIN']
                    },
                    isActive: true
                }
            });

            if (!participant) {
                throw createHttpError.Forbidden('Only conversation owners and admins can update settings');
            }

            const updatedConversation = await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    name: name ?? undefined,
                    metadata: metadata ? {
                        ...(await prisma.conversation.findUnique({
                            where: { id: conversationId },
                            select: { metadata: true }
                        }))?.metadata,
                        ...metadata
                    } : undefined
                },
                include: {
                    participants: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: updatedConversation
            });
        } catch (error) {
            next(error);
        }
    }

    async forwardMessage(req, res, next) {
        try {
            const { messageId } = req.params;
            const { targetConversationIds } = req.body;
            const userId = req.user.id;

            // Get original message
            const originalMessage = await prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    attachments: true
                }
            });

            if (!originalMessage) {
                throw createHttpError.NotFound('Original message not found');
            }

            // Verify user has access to target conversations
            const accessibleConversations = await prisma.conversationParticipant.findMany({
                where: {
                    conversationId: {
                        in: targetConversationIds
                    },
                    userId,
                    isActive: true
                }
            });

            if (accessibleConversations.length !== targetConversationIds.length) {
                throw createHttpError.Forbidden('You do not have access to one or more target conversations');
            }

            // Forward message to each conversation
            const forwardedMessages = await Promise.all(
                accessibleConversations.map(async (participant) => {
                    const message = await prisma.message.create({
                        data: {
                            conversationId: participant.conversationId,
                            senderId: participant.id,
                            content: originalMessage.content,
                            type: originalMessage.type,
                            metadata: {
                                ...originalMessage.metadata,
                                forwardedFrom: {
                                    messageId: originalMessage.id,
                                    conversationId: originalMessage.conversationId
                                }
                            },
                            // Copy attachments if any
                            attachments: originalMessage.attachments.length > 0 ? {
                                create: originalMessage.attachments.map(att => ({
                                    url: att.url,
                                    filename: att.filename,
                                    fileType: att.fileType,
                                    fileSize: att.fileSize,
                                    mimeType: att.mimeType,
                                    status: att.status,
                                    dimensions: att.dimensions,
                                    duration: att.duration
                                }))
                            } : undefined
                        },
                        include: {
                            attachments: true
                        }
                    });

                    return message;
                })
            );

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: forwardedMessages
            });
        } catch (error) {
            next(error);
        }
    }

    async searchMessages(req, res, next) {
        try {
            const { conversationId } = req.params;
            const { query, page = 1, limit = 20 } = req.query;
            const userId = req.user.id;
            const skip = (page - 1) * limit;

            // Verify user is participant
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId,
                    isActive: true
                }
            });

            if (!participant) {
                throw createHttpError.Forbidden('You are not a participant in this conversation');
            }

            const messages = await prisma.message.findMany({
                where: {
                    conversationId,
                    OR: [
                        {
                            content: {
                                contains: query,
                                mode: 'insensitive'
                            }
                        },
                        {
                            attachments: {
                                some: {
                                    filename: {
                                        contains: query,
                                        mode: 'insensitive'
                                    }
                                }
                            }
                        }
                    ]
                },
                include: {
                    sender: true,
                    attachments: true,
                    reactions: true,
                    readReceipts: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limit)
            });

            const total = await prisma.message.count({
                where: {
                    conversationId,
                    content: {
                        contains: query,
                        mode: 'insensitive'
                    }
                }
            });

            return this.success(res, {
                statusCode: StatusCodes.OK,
                data: {
                    messages,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // 1. Mute/Unmute Conversation
    async muteConversation(req, res) {
        try {
        const { conversationId, userId, duration } = req.body;
        const mutedUntil = duration ? new Date(Date.now() + duration) : null;

        const participant = await prisma.conversationParticipant.update({
            where: {
            conversationId_userId: {
                conversationId,
                userId
            }
            },
            data: {
            isMuted: true,
            mutedUntil
            }
        });

        return this.success(res, participant);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 2. Pin/Unpin Conversation
    async pinConversation(req, res) {
        try {
        const { conversationId } = req.body;
        const conversation = await prisma.conversation.update({
            where: { id: conversationId },
            data: {
            metadata: {
                isPinned: true,
                pinnedAt: new Date()
            }
            }
        });

        return this.success(res, conversation);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 3. Archive Conversation
    async archiveConversation(req, res) {
        try {
        const { conversationId } = req.body;
        const conversation = await prisma.conversation.update({
            where: { id: conversationId },
            data: {
            metadata: {
                isArchived: true,
                archivedAt: new Date()
            }
            }
        });

        return this.success(res, conversation);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 4. Get Conversation Statistics
    async getConversationStats(req, res) {
        try {
        const { conversationId } = req.params;
        const stats = await prisma.message.groupBy({
            by: ['senderId'],
            where: {
            conversationId
            },
            _count: {
            id: true
            },
            _max: {
            createdAt: true
            }
        });

        return this.success(res, stats);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 5. Get Participant Activity
    async getParticipantActivity(req, res) {
        try {
        const { conversationId, userId } = req.params;
        const activity = await prisma.message.findMany({
            where: {
            conversationId,
            senderId: userId
            },
            include: {
            reactions: true,
            readReceipts: true
            },
            orderBy: {
            createdAt: 'desc'
            }
        });

        return this.success(res, activity);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 6. Bulk Delete Messages
    async bulkDeleteMessages(req, res) {
        try {
        const { messageIds } = req.body;
        const deletedMessages = await prisma.message.updateMany({
            where: {
            id: {
                in: messageIds
            }
            },
            data: {
            deletedAt: new Date()
            }
        });

        return this.success(res, deletedMessages);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 7. Get Message Analytics
    async getMessageAnalytics(req, res) {
        try {
        const { conversationId } = req.params;
        const analytics = await prisma.$transaction([
            // Message count by type
            prisma.message.groupBy({
            by: ['type'],
            where: { conversationId },
            _count: true
            }),
            // Reaction statistics
            prisma.messageReaction.groupBy({
            by: ['emoji'],
            where: {
                message: {
                conversationId
                }
            },
            _count: true
            }),
            // Attachment statistics
            prisma.attachment.groupBy({
            by: ['fileType'],
            where: {
                message: {
                conversationId
                }
            },
            _count: true
            })
        ]);

        return this.success(res, analytics);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 8. Export Conversation History
    async exportConversationHistory(req, res) {
        try {
        const { conversationId, format = 'json' } = req.body;
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
            messages: {
                include: {
                sender: true,
                attachments: true,
                reactions: true
                }
            },
            participants: true
            }
        });

        // Format the data based on requested format
        const formattedData = format === 'json' ? 
            JSON.stringify(conversation) : 
            this.formatConversationForExport(conversation, format);

        return this.success(res, { data: formattedData, format });
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 9. Get Conversation Attachments Summary
    async getAttachmentsSummary(req, res) {
        try {
        const { conversationId } = req.params;
        const summary = await prisma.attachment.groupBy({
            by: ['fileType'],
            where: {
            message: {
                conversationId
            }
            },
            _count: {
            id: true
            },
            _sum: {
            fileSize: true
            }
        });

        return this.success(res, summary);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

    // 10. Update Participant Roles Bulk
    async updateParticipantRolesBulk(req, res) {
        try {
        const { conversationId, participantUpdates } = req.body;
        const updates = await Promise.all(
            participantUpdates.map(update => 
            prisma.conversationParticipant.update({
                where: {
                conversationId_userId: {
                    conversationId,
                    userId: update.userId
                }
                },
                data: {
                role: update.role
                }
            })
            )
        );

        return this.success(res, updates);
        } catch (error) {
        throw createHttpError(StatusCodes.BAD_REQUEST, error.message);
        }
    }

}

module.exports = {
    ConversationController: new ConversationController()
};