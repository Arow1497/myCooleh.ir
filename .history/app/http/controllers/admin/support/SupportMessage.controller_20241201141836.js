const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AdminCommunicationController extends Controller {
    // Create a new support conversation with admin
    async createSupportConversation(req, res) {
        try {
            const { userId, subject } = req.body;

            // Find an available admin
            const admin = await prisma.socialProfile.findFirst({
                where: {
                    role: 'ADMIN',
                    isActive: true
                }
            });

            if (!admin) {
                throw createError(HttpStatus.SERVICE_UNAVAILABLE, "No admin available at the moment");
            }

            // Create a new conversation
            const conversation = await prisma.conversation.create({
                data: {
                    type: 'SUPPORT',
                    name: `Support - ${subject}`,
                    participants: {
                        create: [
                            {
                                userId: userId,
                                role: 'MEMBER'
                            },
                            {
                                userId: admin.id,
                                role: 'ADMIN'
                            }
                        ]
                    }
                },
                include: {
                    participants: true
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    conversation
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Send message in support conversation
    async sendSupportMessage(req, res) {
        try {
            const { conversationId, content, attachments } = req.body;
            const senderId = req.user.id;

            // Verify conversation exists and user is participant
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    participants: {
                        some: {
                            userId: senderId,
                            isActive: true
                        }
                    }
                },
                include: {
                    participants: true
                }
            });

            if (!conversation) {
                throw createError(HttpStatus.NOT_FOUND, "Support conversation not found");
            }

            // Create message
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderId,
                    content,
                    type: 'TEXT',
                    attachments: attachments ? {
                        create: attachments.map(att => ({
                            url: att.url,
                            filename: att.filename,
                            fileType: att.fileType,
                            fileSize: att.fileSize,
                            mimeType: att.mimeType
                        }))
                    } : undefined
                },
                include: {
                    attachments: true,
                    sender: true
                }
            });

            // Update conversation lastMessageAt
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get user's support conversations
    async getSupportConversations(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const conversations = await prisma.conversation.findMany({
                where: {
                    type: 'SUPPORT',
                    participants: {
                        some: {
                            userId,
                            isActive: true
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
                        take: 1,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                },
                orderBy: {
                    lastMessageAt: 'desc'
                },
                skip,
                take: limit
            });

            const total = await prisma.conversation.count({
                where: {
                    type: 'SUPPORT',
                    participants: {
                        some: {
                            userId,
                            isActive: true
                        }
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    conversations,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get conversation messages
    async getSupportMessages(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            // Verify user's access to conversation
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    participants: {
                        some: {
                            userId,
                            isActive: true
                        }
                    }
                }
            });

            if (!conversation) {
                throw createError(HttpStatus.NOT_FOUND, "Support conversation not found");
            }

            const messages = await prisma.message.findMany({
                where: {
                    conversationId
                },
                include: {
                    sender: {
                        include: {
                            user: true
                        }
                    },
                    attachments: true,
                    readReceipts: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            });

            const total = await prisma.message.count({
                where: {
                    conversationId
                }
            });

            // Mark messages as read
            await prisma.messageReadReceipt.createMany({
                data: messages
                    .filter(msg => msg.senderId !== userId)
                    .map(msg => ({
                        messageId: msg.id,
                        userId
                    })),
                skipDuplicates: true
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    messages,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Close support conversation
    async closeSupportConversation(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;

            // Verify user is admin or conversation owner
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    participants: {
                        some: {
                            userId,
                            OR: [
                                { role: 'ADMIN' },
                                { role: 'MEMBER' }
                            ]
                        }
                    }
                }
            });

            if (!conversation) {
                throw createError(HttpStatus.NOT_FOUND, "Support conversation not found");
            }

            // Update conversation status
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    isActive: false
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Support conversation closed successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    AdminCommunicationController: new AdminCommunicationController()
};