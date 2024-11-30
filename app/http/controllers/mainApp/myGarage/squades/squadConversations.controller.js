const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClanConversationController extends Controller {
  // Private helper methods
  async #validateClanMembership(userId, clanId) {
    const membership = await prisma.clanMembership.findUnique({
      where: {
        clanId_userId: {
          clanId,
          userId
        }
      }
    });

    if (!membership) {
      throw createError(HttpStatus.FORBIDDEN, "شما عضو این کلن نیستید");
    }
    return membership;
  }

  async #validateAttachmentType(attachments) {
    if (!attachments) return;
    
    const allowedTypes = ['image', 'audio'];
    for (const attachment of attachments) {
      const fileType = attachment.fileType.toLowerCase();
      if (!allowedTypes.includes(fileType)) {
        throw createError(HttpStatus.BAD_REQUEST, "فقط ارسال تصویر و فایل صوتی مجاز است");
      }
    }
  }

  async #validateMessagePermissions(userId, conversationId) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId
      }
    });

    if (!participant) {
      throw createError(HttpStatus.FORBIDDEN, "شما عضو این گفتگو نیستید");
    }

    return participant;
  }

  // ClanConversation Handlers
  async createConversation(req, res) {
    const { clanId, name } = req.body;
    const userId = req.user.id;

    await this.#validateClanMembership(userId, clanId);

    const conversation = await prisma.clanConversation.create({
      data: {
        clanId,
        name,
        type: 'GROUP',
        participants: {
          create: {
            userId
          }
        }
      }
    });

    return res.status(HttpStatus.CREATED).json(conversation);
  }

  async getConversations(req, res) {
    const { clanId } = req.params;
    const userId = req.user.id;

    await this.#validateClanMembership(userId, clanId);

    const conversations = await prisma.clanConversation.findMany({
      where: { clanId },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return res.status(HttpStatus.OK).json(conversations);
  }

  async getConversationMessages(req, res) {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    const conversation = await prisma.clanConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw createError(HttpStatus.NOT_FOUND, "گفتگو یافت نشد");
    }

    await this.#validateClanMembership(userId, conversation.clanId);
    await this.#validateMessagePermissions(userId, conversationId);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: true,
        attachments: true,
        reactions: true,
        readReceipts: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return res.status(HttpStatus.OK).json(messages);
  }

  async sendMessage(req, res) {
    const { conversationId, content, attachments, replyToId } = req.body;
    const userId = req.user.id;

    const conversation = await prisma.clanConversation.findUnique({
      where: { id: conversationId },
      include: { clan: true }
    });

    if (!conversation) {
      throw createError(HttpStatus.NOT_FOUND, "گفتگو یافت نشد");
    }

    await this.#validateClanMembership(userId, conversation.clanId);
    await this.#validateAttachmentType(attachments);
    await this.#validateMessagePermissions(userId, conversationId);

    if (replyToId) {
      const replyMessage = await prisma.message.findUnique({
        where: { id: replyToId, conversationId }
      });
      if (!replyMessage) {
        throw createError(HttpStatus.NOT_FOUND, "پیام مورد نظر برای پاسخ یافت نشد");
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type: attachments ? 'FILE' : 'TEXT',
        replyToId,
        attachments: attachments ? {
          create: attachments
        } : undefined
      },
      include: {
        sender: true,
        attachments: true
      }
    });

    return res.status(HttpStatus.CREATED).json(message);
  }

  async addMessageReaction(req, res) {
    const { messageId, emoji } = req.body;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) {
      throw createError(HttpStatus.NOT_FOUND, "پیام یافت نشد");
    }

    await this.#validateClanMembership(userId, message.conversation.clanId);
    await this.#validateMessagePermissions(userId, message.conversationId);

    const reaction = await prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      },
      update: {},
      create: {
        messageId,
        userId,
        emoji
      }
    });

    return res.status(HttpStatus.OK).json(reaction);
  }

  async markMessagesAsRead(req, res) {
    const { conversationId, messageIds } = req.body;
    const userId = req.user.id;

    await this.#validateMessagePermissions(userId, conversationId);

    const readReceipts = await prisma.$transaction(
      messageIds.map(messageId =>
        prisma.messageReadReceipt.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId
            }
          },
          update: {},
          create: {
            messageId,
            userId
          }
        })
      )
    );

    return res.status(HttpStatus.OK).json(readReceipts);
  }

  async pinMessage(req, res) {
    const { conversationId, messageId } = req.body;
    const userId = req.user.id;

    const conversation = await prisma.clanConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw createError(HttpStatus.NOT_FOUND, "گفتگو یافت نشد");
    }

    const membership = await this.#validateClanMembership(userId, conversation.clanId);
    
    if (membership.communicationRoles !== 'CHAT_ADMIN' && 
        membership.communicationRoles !== 'MODERATOR') {
      throw createError(HttpStatus.FORBIDDEN, "شما اجازه پین کردن پیام را ندارید");
    }

    const pinnedMessage = await prisma.pinnedClanMessage.create({
      data: {
        conversationId,
        messageId,
        pinnedBy: userId
      }
    });

    return res.status(HttpStatus.CREATED).json(pinnedMessage);
  }

  async editMessage(req, res) {
    const { messageId, content } = req.body;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) {
      throw createError(HttpStatus.NOT_FOUND, "پیام یافت نشد");
    }

    if (message.senderId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما فقط می‌توانید پیام‌های خود را ویرایش کنید");
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date()
      }
    });

    return res.status(HttpStatus.OK).json(updatedMessage);
  }

  // ClanCommunication Handlers
  async createCommunication(req, res) {
    const { clanId, title, content, type, metadata } = req.body;
    const userId = req.user.id;

    const membership = await this.#validateClanMembership(userId, clanId);

    const communication = await prisma.clanCommunication.create({
      data: {
        clanId,
        senderId: membership.id,
        title,
        content,
        type,
        metadata
      }
    });

    return res.status(HttpStatus.CREATED).json(communication);
  }

  async addReaction(req, res) {
    const { communicationId, reaction } = req.body;
    const userId = req.user.id;

    const communication = await prisma.clanCommunication.findUnique({
      where: { id: communicationId },
      include: { clan: true }
    });

    if (!communication) {
      throw createError(HttpStatus.NOT_FOUND, "اعلان یافت نشد");
    }

    await this.#validateClanMembership(userId, communication.clanId);

    const userReaction = await prisma.clanCommunicationReaction.upsert({
      where: {
        communicationId_userId: {
          communicationId,
          userId
        }
      },
      update: { reaction },
      create: {
        communicationId,
        userId,
        reaction
      }
    });

    return res.status(HttpStatus.OK).json(userReaction);
  }

  async replyCommunication(req, res) {
    const { communicationId, content } = req.body;
    const userId = req.user.id;

    const communication = await prisma.clanCommunication.findUnique({
      where: { id: communicationId },
      include: { clan: true }
    });

    if (!communication) {
      throw createError(HttpStatus.NOT_FOUND, "اعلان یافت نشد");
    }

    await this.#validateClanMembership(userId, communication.clanId);

    const reply = await prisma.clanCommunicationReply.create({
      data: {
        communicationId,
        userId,
        content
      }
    });

    return res.status(HttpStatus.CREATED).json(reply);
  }

  // ClanCommunicationThread Handlers
  async createThread(req, res) {
    const { clanId, title, category, tags, metadata } = req.body;
    const userId = req.user.id;

    await this.#validateClanMembership(userId, clanId);

    const thread = await prisma.clanCommunicationThread.create({
      data: {
        clanId,
        title,
        category,
        status: 'OPEN',
        tags,
        metadata,
        lastActivityAt: new Date(),
        initiatorId: userId,
        participants: {
          create: {
            userId,
            role: 'MEMBER'
          }
        }
      }
    });

    return res.status(HttpStatus.CREATED).json(thread);
  }

  async getThreads(req, res) {
    const { clanId } = req.params;
    const { status, category } = req.query;
    const userId = req.user.id;

    await this.#validateClanMembership(userId, clanId);

    const threads = await prisma.clanCommunicationThread.findMany({
      where: {
        clanId,
        ...(status && { status }),
        ...(category && { category })
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastActivityAt: 'desc' }
    });

    return res.status(HttpStatus.OK).json(threads);
  }

  async sendThreadMessage(req, res) {
    const { threadId, content, attachments } = req.body;
    const userId = req.user.id;

    const thread = await prisma.clanCommunicationThread.findUnique({
      where: { id: threadId },
      include: { clan: true }
    });

    if (!thread) {
      throw createError(HttpStatus.NOT_FOUND, "گفتگو یافت نشد");
    }

    await this.#validateClanMembership(userId, thread.clanId);
    await this.#validateAttachmentType(attachments);

    const participant = await prisma.communicationThreadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId
        }
      }
    });

    if (!participant) {
      throw createError(HttpStatus.FORBIDDEN, "شما عضو این گفتگو نیستید");
    }

    const message = await prisma.message.create({
      data: {
        clanCommunicationThreadId: threadId,
        senderId: userId,
        content,
        type: attachments ? 'FILE' : 'TEXT',
        attachments: attachments ? {
          create: attachments
        } : undefined
      }
    });

    await prisma.clanCommunicationThread.update({
      where: { id: threadId },
      data: { lastActivityAt: new Date() }
    });

    return res.status(HttpStatus.CREATED).json(message);
  }

  async joinThread(req, res) {
    const { threadId } = req.body;
    const userId = req.user.id;

    const thread = await prisma.clanCommunicationThread.findUnique({
      where: { id: threadId },
      include: { clan: true }
    });

    if (!thread) {
      throw createError(HttpStatus.NOT_FOUND, "گفتگو یافت نشد");
    }

    await this.#validateClanMembership(userId, thread.clanId);

    const participant = await prisma.communicationThreadParticipant.create({
      data: {
        threadId,
        userId,
        role: 'MEMBER'
      }
    });

    return res.status(HttpStatus.CREATED).json(participant);
  }

  async updateThreadStatus(req, res) {
    const { threadId, status } = req.body;
    const userId = req.user.id;

    const thread = await prisma.clanCommunicationThread.findUnique({
      where: { id: threadId },
      include: { clan: true }
    });

    if (!thread) {
      throw createError(HttpStatus.NOT_FOUND, "گفتگو یافت نشد");
    }

    await this.#validateClanMembership(userId, thread.clanId);

    const participant = await prisma.communicationThreadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId
        }
      }
    });

    if (thread.initiatorId !== userId && participant?.role !== 'ADMIN') {
      throw createError(HttpStatus.FORBIDDEN, "شما اجازه تغییر وضعیت این گفتگو را ندارید");
    }

    const updatedThread = await prisma.clanCommunicationThread.update({
      where: { id: threadId },
      data: { status }
    });

    return res.status(HttpStatus.OK).json(updatedThread);
  }
}

module.exports = {
  ClanConversationController: new ClanConversationController()
};