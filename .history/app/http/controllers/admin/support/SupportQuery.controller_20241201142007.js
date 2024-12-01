const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SupportQueryController extends Controller {
    // Get all support tickets for a user
    async getUserSupportTickets(req, res, next) {
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

    // Get all support tickets for admin
    async getAdminSupportTickets(req, res, next) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const status = req.query.status; // 'pending', 'answered', 'closed'

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const whereClause = {
                type: 'SUPPORT',
                ...(status === 'pending' && {
                    messages: {
                        every: {
                            sender: {
                                role: 'MEMBER'
                            }
                        }
                    }
                }),
                ...(status === 'answered' && {
                    messages: {
                        some: {
                            sender: {
                                role: 'ADMIN'
                            }
                        }
                    },
                    isActive: true
                }),
                ...(status === 'closed' && {
                    isActive: false
                })
            };

            const conversations = await prisma.conversation.findMany({
                where: whereClause,
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
                where: whereClause
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
    async getTicketMessages(req, res, next) {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            // Verify access rights
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    type: 'SUPPORT',
                    OR: [
                        {
                            participants: {
                                some: {
                                    userId,
                                    isActive: true
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
                    attachments: true
                },
                orderBy: {
                    createdAt: 'asc'
                },
                skip,
                take: limit
            });

            const total = await prisma.message.count({
                where: {
                    conversationId
                }
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
}

module.exports = {
    SupportQueryController: new SupportQueryController()
};