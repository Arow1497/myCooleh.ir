/*
همکاری دستیار شاگرد برونسپاری درون سازمانی بین اعضای کلن
*/
const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClanCollburationController extends Controller {
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

}


module.exports = {
    ClanCollburationController : new ClanCollburationController()
};