const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { ListOfImagesFromRequest, getTime } = require("../../../../utils/functions");
const { garagesSchema } = require("../../../validators/MainApp/garages.schema");
const { serialNumGenerator, ListOfImagesFromRequest, deleteFileInPublic } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");


class SupplierStoreCouponsController extends Controller{
// Private helper methods
async #validateTransactionOwnership(transactionId, userId, role) {
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
            noticeApprentice: {
                select: {
                    apprenticeId: true,
                    publisherId: true
                }
            }
        }
    });
  
    if (!transaction) throw createError.NotFound("Transaction not found");
  
    const isOwner = role === 'apprentice' 
        ? transaction.noticeApprentice.apprenticeId === userId
        : transaction.noticeApprentice.publisherId === userId;
  
    if (!isOwner) throw createError.Unauthorized("Not authorized to perform this action");
  
    return transaction;
  }
  
  async #validateGarageOwnership(user) {
    const garageId = user?.ownedGarage?.id;
    if (!garageId) {
      throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
    }
    return garageId;
  }
  
  // Controller methods
   async createCoupon(req, res, next){
    try {
        await CreateCouponSchema.validateAsync(req.body);
        const{title, description, category, price, couponPrice} = req.body;
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        const publisher = req.user._id;
        const supplierStoreID = req?.user?.supplierStoreID;
        // if(!supplierStoreID) throw createError.NotAcceptable("ثبت کوپن فقط بعد از ثبت یدکی امکانپذیر است");
        const nearBy = req.user.supplierStoreLat_Lng;
        const generatedSerial = getLink(supplierStoreID);
        const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`
        const createCoupon = await CouponsModel.create({
         publisher,
         title,
         description,
         category,
         supplierStoreID,
         images,
         couponPrice,
         shareLink,
         price,
         nearBy
       })
       return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
     data: {
        message: "ثبت کوپن با موفقیت انجام شد"
         }
       });
    } catch (error) {
          deleteFileInPublic(req.files);
             next(error)
         }
   }//سرویس کوپن به مثابه قراردادیه که یدکی با چندتا گاراژ میبنده که مثلا هر کیس تعمیراتی 
   // داشتی از کیت دیسک صفحه یا تسمه تایم آیسین که من تامین میکنم استفاده کن ...3


   async removeCouponById(req, res, next){
    try {
        const {couponID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const coupon = await this.findCouponById(couponID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!coupon.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("حذف کوپن فقط برای ناشر آن مجاز است");
      }
           const removeCouponResult = await CouponsModel.deleteOne({ _id: coupon._id });
           if (!removeCouponResult.deletedCount) throw createError.InternalServerError("حذف کوپن انجام نشد");
       
       return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data : {
          message: "حذف کوپن با موفقیت انجام شد"
        }
      })
    } catch (error) {
        next(error)
    }
   }

   async editCouponById(req, res, next){
    try {
        await UpdateCouponSchema.validateAsync(req.body);
        const { couponID } = req.params;
        const applicantID = req.user._id;
        // پیدا کردن پست و اطمینان از موجودیت آن
        const coupon = await this.findCouponById(couponID)
        // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
        if (!coupon.publisher.equals(applicantID)) {
            throw createError.NotAcceptable("ویرایش کوپن فقط برای ناشر آن مجاز است");
        }
        // کپی داده‌های ارسالی
        let data = copyObjet(req.body);
        let blackListFields = [
            "_id",
            "bookmarks",
            "publisher",
            "shareLink",
            "supplierStoreID",
            "nearBy",
            "comments",
            "likes",
            "dislikes",
            "garageID",
            "clientID",
            "views"
        ];
        // پردازش فایل‌های تصاویر
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        (images.length > 0) ? data.images = images : blackListFields.push("images");

        // حذف فیلدهای نامعتبر از داده‌های ورودی
        deleteInvalidPropertyInObject(data, blackListFields);

        const updateCouponResult = await CouponsModel.updateOne({ _id: coupon._id }, { $set: data });
        if (!updateCouponResult.modifiedCount) {
            throw createError.InternalServerError("بروزرسانی کوپن انجام نشد");
        }
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "به روز رسانی کوپن  با موفقیت انجام شد"
            }
        });
    } catch (error) {
        // در صورت بروز خطا، فایل‌های آپلود شده حذف می‌شوند
        deleteFileInPublic(req.files);
        next(error);
    }
   }

   async getAllCoupons(req, res, next){
    try {
        const {search} = req.query;
        const {category} = req.query;
        let coupon;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
        coupon = await CouponsModel.find(query)
        .populate([
            {path: "category", select: {title: 1}},
            {path: "publisher", select: {first_name: 1, last_name:1, mobile:1}},
            {path: "comments.from_user"},
            {path: "likes"},
            {path: "dislikes"},
            {path: "bookmarks"},
        ])
        .sort({_id : -1});
    
        return res.status(HttpStatus.OK).json({
            statusCode : HttpStatus.OK,
            data : {
                coupon
            }
        })
    } catch (error) {
        next(error)
    }
   }


   async getListOfCoupons(req, res, next){
    try {
        const applicantID = req.user._id;  // ایدی درخواست دهنده
       const coupon = await CouponsModel.find({"publisher": applicantID}).populate([
        {path: "category", select: {children: 0, prent: 0}},
        {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
       ]).sort({_id : -1});
    } catch (error) {
        next(error)
    }
   } // دیدن اگهی های خودش --یدکی

   async getOneCouponById(req, res, next){
    try {
        const { couponID } = req.params;
        const coupon = await this.findCouponById(couponID);
         if(!coupon) throw createHttpError.NotFound("چنین کوپنی یافت نشد");
         coupon.views += 1;
         await coupon.save();
         return res.status(HttpStatus.OK).json({
           statusCode: HttpStatus.OK,
           data : {
            coupon
           }
         })
    } catch (error) {
        next(error)
    }
   }
 
   async getCommentsOfCoupon(req, res, next){
    try {
        const {couponID} = req.params;
        await this.findCouponById(couponID);
        const coupon = await CouponsModel.findOne({_id: couponID})
        .populate({
            path: "comments",
            select: "comment answers -_id",
        })
        .select("comments")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                coupon
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async addCommentsForCoupon(req, res, next){
    try {
        const user = req.user;
        const { couponID } = req.params;
        const { comment, parent } = req.body;

        // اعتبارسنجی شناسه پست
        if (!mongoose.isValidObjectId(couponID)) throw createError.BadGateway("شناسه کوپن ارسال شده صحیح نمی‌باشد");
        const coupon = await this.findCouponById(couponID);
        if (!coupon) throw createError.NotFound("کوپن یافت نشد");

        // اگر parent وجود دارد، یعنی قصد ثبت پاسخ به یک کامنت یا پاسخ داریم
        if (parent && mongoose.isValidObjectId(parent)) {
            const commentDocument = await this.findCommentOrAnswer(coupon.comments, parent);
            if (!commentDocument) throw createError.NotFound("کامنت یا پاسخی با این شناسه یافت نشد");
            if (!commentDocument.openToComment) throw createError.BadRequest("ثبت پاسخ مجاز نیست");

            // اضافه کردن پاسخ به کامنت یا پاسخ مورد نظر
            commentDocument.answers.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });

            await coupon.save(); // ذخیره تغییرات
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما با موفقیت ثبت شد"
                }
            });
        } else {
            // در صورتی که parent وجود نداشته باشد، یک کامنت جدید ثبت می‌شود
            coupon.comments.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });
            await coupon.save(); // ذخیره تغییرات
        }

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "ثبت نظر با موفقیت انجام شد"
            }
        });
    } catch (error) {
        next(error);
    }
   }

   async BookmarkCoupon(req, res, next){
    try {
        const user = req.user._id;
        const {couponID} = req.parms;
        await this.findCouponById(couponID);
        let BookmarkedCoupon = await CouponsModel.findOne({
            _id: couponID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedCoupon? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await CouponsModel.updateOne({ _id: couponID }, updateQuery)
        let message
        if(!BookmarkedCoupon){ 
            message = "کوپن به علاقه مندی های شما اضافه شد"
        } else message = "کوپن از علاقه مندی های شما حذف شد"

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                message
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async likeCoupon(req, res, next){
    try {
        const user = req.user._id;
        const {couponID} = req.params;
        await findCouponById(couponID);
        let likedcoupon = await CouponsModel.findOne({
            _id: couponID,
            likes : user._id
        })
        let dislikedcoupon = await CouponsModel.findOne({
            _id: couponID,
            dislike : user._id
        })
        const updateQuery = likedcoupon? {$pull:{likes: user._id}} : {$push: {likes: user._id}}
        await CouponsModel.updateOne({ _id: couponID }, updateQuery)
        let message
        if(!likedcoupon){
            if(dislikedcoupon) await CouponsModel.updateOne({ _id: couponID }, {$pull: {dislike: user._id}})
            message = "پسندیدن کوپن با موفقیت انجام شد"
        } else message = "پسندیدن کوپن لغو شد"
        return {
            statusCode: HttpStatus.CREATED,
            data : {
                message
            }
        }
    } catch (error) {
        next(error)
    }
   }

   async dislikeCoupon(req, res, next){
    try {
        const user = req.user._id;
        const {couponID} = req.params;
        await findCouponById(couponID)
        let likedcoupon = await CouponsModel.findOne({
            _id: couponID,
            likes : user._id
        })
        let dislikedcoupon = await CouponsModel.findOne({
            _id: couponID,
            dislikes : user._id
        })
        const updateQuery = dislikedcoupon? {$pull:{dislikes: user._id}} : {$push: {dislikes: user._id}}
        await CouponsModel.updateOne({ _id: couponID }, updateQuery)
        let message
        if(!dislikedcoupon){
            if(likedcoupon) await CouponsModel.updateOne({ _id: couponID }, {$pull: {likes: user._id}})
            message = "نپسندیدن کوپن با موفقیت انجام شد"
        } else message = "نپسندیدن کوپن لغو شد"

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                message
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async shareCoupon(req, res, next){
    try {
        const {couponID} = req.params;
        await this.findCouponById(couponID);
        const coupon = await CouponsModel.findOne({_id: couponID},{})
        .populate([
            {path: "shareLink",} 
        ])
        .select("shareLink")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                coupon
            }
        })
    } catch (error) {
        next(error)
    }
   }


   async addCouponByIdToCooleh(req, res, next){
    try {
        const garageID = req.user.garageID;
        const {couponID} = req.parms;
        await this.findCouponById(couponID);

  let AddCoupon = await CouponsModel.findOne({
            _id: couponID,
            garageID : garageID
        })
        const updateQuery = AddCoupon? {$pull:{garageID: garageID}} : {$push: {garageID: garageID}}
        await CouponsModel.updateOne({ _id: couponID }, updateQuery)
        let message
        if(!AddCoupon){ 
            message = "کوپن به کوله شما اضافه شد"
        } else message = "کوپن از کوله شما حذف شد"

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                message
            }
        })

    } catch (error) {
        next(error)
    }
   }


   async peleCouponById(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }// فرستادن اگهی به صدر--بعدا پولی میشه

   async successSellCouponById(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }// عملیات فروش موفق گاراژ با این کوپن


   //////////////////////////////////////////////////////////////////////////////////
   async findCouponById(couponID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: couponID });
    const coupon = await CouponsModel.findById(id);
    if (!coupon) throw new createError.NotFound("کوپن موردنظر یافت نشد")
    return coupon
  }

}


module.exports = {
    SupplierStoreCouponsController: new SupplierStoreCouponsController()
}