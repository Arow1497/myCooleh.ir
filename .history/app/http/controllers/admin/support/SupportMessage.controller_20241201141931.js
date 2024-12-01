const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SupportMessageController extends Controller {
    // Create a new support ticket/conversation
    async createSupportTicket(req, res, next) {
        try {
            const { subject, message } = req.body;
            const userId = req.user.id;

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
                            }
                        ]
                    },
                    messages: {
                        create: [
                            {
                                senderId: userId,
                                content: message,
                                type: 'TEXT'
                            }
                        ]
                    }
                },
                include: {
                    participants: true,
                    messages: true
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

    // Reply to a support conversation
    async replySupportTicket(req, res, next) {
        try {
            const { conversationId } = req.params;
            const { content, attachments } = req.body;
            const userId = req.user.id;

            // Verify conversation exists and user has access
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    isActive: true,
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

            // Create reply message
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderId: userId,
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
}

module.exports = {
    SupportMessageController: new SupportMessageController()
};