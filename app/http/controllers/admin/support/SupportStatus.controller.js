const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SupportStatusController extends Controller {
    // Close support ticket
    async closeSupportTicket(req, res, next) {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const { closeReason } = req.body;

            // Verify user is admin or ticket owner
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    OR: [
                        {
                            participants: {
                                some: {
                                    userId,
                                    role: 'MEMBER'
                                }
                            }
                        },
                        {
                            participants: {
                                some: {
                                    user: {
                                        role: 'ADMIN'
                                    }
                                }
                            }
                        }
                    ]
                }
            });

            if (!conversation) {
                throw createError(HttpStatus.NOT_FOUND, "Support ticket not found");
            }

            // Add closing message
            await prisma.message.create({
                data: {
                    conversationId,
                    senderId: userId,
                    content: `Ticket closed. Reason: ${closeReason || 'Not specified'}`,
                    type: 'SYSTEM'
                }
            });

            // Update conversation status
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    isActive: false,
                    metadata: {
                        closedBy: userId,
                        closeReason,
                        closedAt: new Date()
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Support ticket closed successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // Reopen support ticket
    async reopenSupportTicket(req, res, next) {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;

            // Verify user is admin
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Only admins can reopen tickets");
            }

            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    isActive: false
                }
            });

            if (!conversation) {
                throw createError(HttpStatus.NOT_FOUND, "Closed support ticket not found");
            }

            // Add reopening message
            await prisma.message.create({
                data: {
                    conversationId,
                    senderId: userId,
                    content: "Ticket reopened by admin",
                    type: 'SYSTEM'
                }
            });

            // Update conversation status
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    isActive: true,
                    metadata: {
                        ...conversation.metadata,
                        reopenedBy: userId,
                        reopenedAt: new Date()
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Support ticket reopened successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    SupportStatusController: new SupportStatusController()
};