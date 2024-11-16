const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ConversationService {
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

module.exports = new ConversationService();