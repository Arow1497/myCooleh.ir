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

  //////////////////////////////////////////////////

    async createNewCollaborationRequest(req, res, next) {
      try {
          const result = await apprenticeNoticeService.createNewCollaborationRequest(
              req.user,
              req.body,
              req.params,
              req.files
          );

          return res.status(HttpStatus.CREATED).json({
              statusCode: HttpStatus.CREATED,
              data: {
                  message: "آگهی درخواست شاگرد با موفقیت ثبت شد",
                  notice: result.notice,
                  share: result.share
              }
          });
      } catch (error) {
          deleteFilesInPublicForOrders(req.files);
          next(error);
      }
  }

  async getAllCollaborationRequest(req, res, next) {
      try {
          const notices = await apprenticeNoticeService.getAllCollaborationRequest(req.query.city);
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: { notices }
          });
      } catch (error) {
          next(error);
      }
  }

  async getOneCollaborationRequestById(req, res, next) {
      try {
          const notice = await apprenticeNoticeService.getOneCollaborationRequestById(req.params.noticeApprenticeId);
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: { notice }
          });
      } catch (error) {
          next(error);
      }
  }

  async removeCollaborationRequestById(req, res, next) {
      try {
          await apprenticeNoticeService.removeCollaborationRequestById(req.params.noticeApprenticeId, req.user.id);
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: { message: "آگهی با موفقیت حذف شد" }
          });
      } catch (error) {
          next(error);
      }
  }

  async editCollaborationRequestsById(req, res, next) {
      try {
          const updatedNotice = await apprenticeNoticeService.editCollaborationRequestsById(
              req.params.noticeApprenticeId,
              req.user.id,
              req.body,
              req.files
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  message: "آگهی با موفقیت بروزرسانی شد",
                  notice: updatedNotice
              }
          });
      } catch (error) {
          deleteFilesInPublicForOrders(req.files);
          next(error);
      }
  }

  async getAllGarageCollaborationRequests(req, res, next) {
      try {
          // همهی اگهی های شاگرد منتج به همکاری شده گاراژ تاریخچه اش چون اونهایی که 
          //منتج به همکاری نشند بعد مدتی از دیتابیس حذف میشن
          const { notices, total } = await apprenticeNoticeService.getAllGarageCollaborationRequests(
              req.user,
              req.query.page,
              req.query.limit
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  notices,
                  pagination: {
                      total,
                      pages: Math.ceil(total / req.query.limit),
                      currentPage: parseInt(req.query.page),
                      perPage: parseInt(req.query.limit)
                  }
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async getAllCollaborationRequestsToItself(req, res, next) {
    try { // همه ی پروژه های تعریف شده از نوع شاگرد که این شخص به عنوان شاگرد درش همکاری داشته
        const { requests, total } = await apprenticeNoticeService.getAllCollaborationRequestsToItself(
            req.user.id,
            req.query.page,
            req.query.limit,
            req.query.status
        );
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                requests,
                pagination: {
                    total,
                    pages: Math.ceil(total / req.query.limit),
                    currentPage: parseInt(req.query.page),
                    perPage: parseInt(req.query.limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
  }

  async getCollaboratorAllActiveCollaborationRequest(req, res, next) {
      try {
          // همکاری های درخواست شاگرد جاری و فعال شخص به عنوان شاگرد
          const { activeNotices, total } = await apprenticeNoticeService.getApprenticeAllActiveNotices(
              req.user.id,
              req.query.page,
              req.query.limit
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  activeNotices,
                  pagination: {
                      total,
                      pages: Math.ceil(total / req.query.limit),
                      currentPage: parseInt(req.query.page),
                      perPage: parseInt(req.query.limit)
                  }
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async getGarageAllActiveCollaborationRequest(req, res, next) {
      try {
          // همکاری های درخواست شاگرد جاری و فعال شخص به عنوان گاراژ
          const { activeNotices, total } = await apprenticeNoticeService.getGarageAllActiveNotices(
              req.user,
              req.query.page,
              req.query.limit
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  activeNotices,
                  pagination: {
                      total,
                      pages: Math.ceil(total / req.query.limit),
                      currentPage: parseInt(req.query.page),
                      perPage: parseInt(req.query.limit)
                  }
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async addCoworkReqForCollaborationRequest(req, res, next) {
    try {
        // ثبت درخواست همکاری از طرف شاگرد
        const noticeApprenticeAppReqs = await coworkService.apprentice.addCoworkRequest(
            req.user,
            req.params.noticeApprenticeId,
            req.params.apprenticeId
        );
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: { noticeApprenticeAppReqs }
        });
    } catch (error) {
        next(error);
    }
  }

  async showCoworkRequestsForRequesterGarage(req, res, next) {
    try {
        // نمایش درخواست ها امکان مشاهده پروفایل شخص و بررسی رزومه و درنهایت
        // انتخاب شخص برای همکاری
        const requests = await coworkService.apprentice.showCoworkRequests(req.user.ownedGarage?.id);
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: { requests }
        });
    } catch (error) {
        next(error);
    }
  }

  async addCollaboratorToRequest(req, res, next) {
    try {
        // هندلر انتخاب و افزودن شاگرد به اگهی و پروژه توسط گاراژ
        const result = await coworkService.apprentice.addCollaboratorToRequest(
            req.user,
            req.params.apprenticeId,
            req.params.noticeApprenticeId,
            req.body
        );
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "شاگرد موردنظر به پروژه افزوده شد",
                result
            }
        });
    } catch (error) {
        next(error);
    }
  }

  async deleteThisCollaboratorFromCollaborationRequest(req, res, next) {
    try {
        await coworkService.apprentice.removeCollaboratorFromRequest(
            req.user.ownedGarage?.id,
            req.params.noticeApprenticeId,
            req.params.apprenticeId
        );
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "شاگرد موردنظر از پروژه حذف شد"
            }
        });
    } catch (error) {
        next(error);
    }
  }

  async collaboratorRefusingFromThisCollaborationRequestship(req, res, next) {
    try {
        //استعفای شاگرد از همکاری پس از پذیرشش توسط گاراژ
        await coworkService.apprentice.collaboratorRefuseRequest(
            req.params.noticeApprenticeId,
            req.user.id
        );
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "شما از این همکاری با موفقیت استعفا دادید"
            }
        });
    } catch (error) {
        next(error);
    }
  }

}


module.exports = {
    ClanCollburationController : new ClanCollburationController()
};