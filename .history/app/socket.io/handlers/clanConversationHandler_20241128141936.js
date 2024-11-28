const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ConversationHandler {
  constructor(io) {
    this.io = io;
  }

  async handleJoinConversation(socket, { conversationId, userId }) {
    try {
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'شما عضو این گفتگو نیستید' });
        return;
      }

      await socket.join(`conversation:${conversationId}`);
      socket.emit('joined', { conversationId });

      // Notify others
      socket.to(`conversation:${conversationId}`).emit('userJoined', {
        userId,
        conversationId
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  async handleSendMessage(socket, { conversationId, content, attachments, replyToId }) {
    try {
      const userId = socket.user.id;

      // Validate conversation membership
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'شما عضو این گفتگو نیستید' });
        return;
      }

      // Validate attachment types
      if (attachments) {
        const allowedTypes = ['image', 'audio'];
        const invalidAttachment = attachments.find(
          att => !allowedTypes.includes(att.fileType.toLowerCase())
        );
        if (invalidAttachment) {
          socket.emit('error', { message: 'فقط ارسال تصویر و فایل صوتی مجاز است' });
          return;
        }
      }

      // Create message
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
          attachments: true,
          replyTo: true
        }
      });

      // Broadcast to all participants
      this.io.to(`conversation:${conversationId}`).emit('newMessage', message);

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  async handleReaction(socket, { messageId, emoji }) {
    try {
      const userId = socket.user.id;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: true }
      });

      if (!message) {
        socket.emit('error', { message: 'پیام یافت نشد' });
        return;
      }

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

      this.io.to(`conversation:${message.conversationId}`).emit('newReaction', reaction);

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  async handleReadReceipt(socket, { conversationId, messageIds }) {
    try {
      const userId = socket.user.id;

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

      this.io.to(`conversation:${conversationId}`).emit('messagesRead', {
        userId,
        messageIds
      });

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  async handleTyping(socket, { conversationId, isTyping }) {
    const userId = socket.user.id;
    socket.to(`conversation:${conversationId}`).emit('userTyping', {
      userId,
      isTyping
    });
  }
}

module.exports = ConversationHandler;