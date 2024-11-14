const createError = require("http-errors");
const Controller = require("../../controller");
const { GaragesModel } = require("../../../../models/Garages/garage");
const { ProjectsModel } = require("../../../../models/Garages/projects");
const { AgahiBoronseparisModel } = require("../../../../models/Mechanics-Garages/agahi.outSourcingRequests");


class GarageAddBoronNoticeController extends Controller{


   async createNewBoronNotice(req, res, next){
    try {
        const garageID = req.user.garageID;
        // const clientID = req.body; // از لیست مشتری های در انتظار انتخاب میکنه مکانیک یک کلاینت رو
        const registrationDataBody = await projectSchema.validateAsync(req.body);
          const {clientID,
            addres,
            lat_lng,
            garageField,
            firs_name,
             last_name,} = registrationDataBody;
             const generatedSerial = getLink(publisher);
             const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`

          const createBoronNotice = await AgahiBoronseparisModel.create({
            garageID,
            clientID,
            status: "accepted",
            partSupplyStatus: "notAdd",
            chassisNumber,
            plateNumber,
            car,
            price,
            shareLink,
            images,
            mechanicsTeam,
            clientAndMechanicVoices,
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data : {
                  message: "ایجاد درخواست با موفقیت انجام شد"
                }
              });
              
    } catch (error) {
        next(error)
    }
   }

   async removeBoronNoticeById(req, res, next){
    try {
        const {boronnoticeID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const post = await this.findBoronNoticeById(boronnoticeID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!post.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("ویرایش گفتمان فقط برای ناشر آن مجاز است");
      }
           const removeProductResult = await AgahiBoronseparisModel.deleteOne({ _id: post._id });
           if (!removeProductResult.deletedCount) throw createError.InternalServerError("حذف گفتمان انجام نشد");
       
       return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data : {
          message: "حذف گفتمان با موفقیت انجام شد"
        }
      });
    } catch (error) {
        console.log(error);
        next(error)
    }
   }

   async editBoronNoticeById(req, res, next) {
    try {
        await UpdateBoronNoticeSchema.validateAsync(req.body);
        const { boronnoticeID } = req.params;
        console.log(boronnoticeID);
        const applicantID = req.user._id;
        // پیدا کردن پست و اطمینان از موجودیت آن
        const post = await this.findBoronNoticeById(boronnoticeID)
        // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
        if (!post.publisher.equals(applicantID)) {
            throw createError.NotAcceptable("ویرایش گفتمان فقط برای ناشر آن مجاز است");
        }
        // کپی داده‌های ارسالی
        let data = copyObjet(req.body);
        let blackListFields = [
            "_id",
            "bookmarks",
            "likes",
            "dislikes",
            "comments",
            "publisher",
            "showOnField",
            "shareLink",
            "views"
        ];
        // پردازش فایل‌های تصاویر
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        (images.length > 0) ? data.images = images : blackListFields.push("images");

        // پردازش فایل‌های ویدیو
        const videoFiles = req?.files?.video || [];
        let time = null;
        let videoAddress = null;

        if (Array.isArray(videoFiles) && videoFiles.length > 0){     
               const { fileUploadPath } = req.body;
            const filename = videoFiles[0].filename;
            if (filename && fileUploadPath) {
                try {
                    videoAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
                    const videoURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`;
                  // بررسی وجود فایل ویدیو و محاسبه مدت زمان آن
                    const seconds = await getVideoDurationInSeconds(videoURL);
                    // اگر محاسبه موفقیت‌آمیز بود، زمان را تنظیم می‌کنیم
                    time = getTime(seconds);
                    blackListFields.push("filename");
                    blackListFields.push("fileUploadPath");
                } catch (error) {
                    // اگر خطایی در محاسبه زمان ویدیو رخ داد، به صورت مناسب مدیریت می‌کنیم
                    console.error("Error calculating video duration:", error);
                    blackListFields.push("time");
                    blackListFields.push("videoAddress");
                }
            } else {
                blackListFields.push("time");
                blackListFields.push("videoAddress");
            }
        } else {
            blackListFields.push("time");
            blackListFields.push("videoAddress");
        }
        // حذف فیلدهای نامعتبر از داده‌های ورودی
        data.time = time;
        data.videoAddress = videoAddress;
        deleteInvalidPropertyInObject(data, blackListFields);

        const updateBoronNoticeResult = await AgahiBoronseparisModel.updateOne({ _id: post._id }, { $set: data });
        if (!updateBoronNoticeResult.modifiedCount) {
            throw createError.InternalServerError("بروزرسانی گفتمان انجام نشد");
        }
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "به روز رسانی با موفقیت انجام شد"
            }
        });
    } catch (error) {
        // در صورت بروز خطا، فایل‌های آپلود شده حذف می‌شوند
        deleteFilesInPublicForBoronNotices(req.files);
        next(error);
    }
}


   async getAllOfGarageBoronNotices(req, res, next){
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
                post
            }
        })
    } catch (error) {
        next(error)
    }
   }// اگهی هایی که پذیرفته شدن توسط گاراژ دیگه ای تا همیشه توی دیتابیس میمونن اونها که 
   //پذیرفته نشدن بعد 6 روز حذف میشن از دیتابیس

   async BookmarkBoronNotice(req, res, next){
    try {
        const user = req.user._id;
        const {boronnoticeID} = req.parms;
        await this.findBoronNoticeById(boronnoticeID);
        let BookmarkedBoronNotice = await AgahiBoronseparisModel.findOne({
            _id: boronnoticeID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedBoronNotice? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await AgahiBoronseparisModel.updateOne({ _id: boronnoticeID }, updateQuery)
        let message
        if(!BookmarkedBoronNotice){ 
            message = "گفتمان به علاقه مندی های شما اضافه شد"
        } else message = "گفتمان از علاقه مندی های شما حذف شد"

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

   async LikeBoronNotice(req, res, next){
    try {
        const user = req.user._id;
        const {boronnoticeID} = req.params;
        await findBoronNoticeById(boronnoticeID);
        let likedBoronNotice = await AgahiBoronseparisModel.findOne({
            _id: boronnoticeID,
            likes : user._id
        })
        let disLikedBoronNotice = await AgahiBoronseparisModel.findOne({
            _id: boronnoticeID,
            dislike : user._id
        })
        const updateQuery = likedBoronNotice? {$pull:{likes: user._id}} : {$push: {likes: user._id}}
        await AgahiBoronseparisModel.updateOne({ _id: boronnoticeID }, updateQuery)
        let message
        if(!likedBoronNotice){
            if(disLikedBoronNotice) await AgahiBoronseparisModel.updateOne({ _id: boronnoticeID }, {$pull: {dislike: user._id}})
            message = "پسندیدن گفتمان با موفقیت انجام شد"
        } else message = "پسندیدن گفتمان لغو شد"
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

   async dislikeBoronNotice(req, res, next){
    try {
        const user = req.user._id;
        const {boronnoticeID} = req.params;
        await findBoronNoticeById(boronnoticeID)
        let likedpost = await AgahiBoronseparisModel.findOne({
            _id: boronnoticeID,
            likes : user._id
        })
        let disLikedpost = await AgahiBoronseparisModel.findOne({
            _id: boronnoticeID,
            dislikes : user._id
        })
        const updateQuery = disLikedpost? {$pull:{dislikes: user._id}} : {$push: {dislikes: user._id}}
        await AgahiBoronseparisModel.updateOne({ _id: boronnoticeID }, updateQuery)
        let message
        if(!disLikedpost){
            if(likedpost) await AgahiBoronseparisModel.updateOne({ _id: boronnoticeID }, {$pull: {likes: user._id}})
            message = "نپسندیدن گفتمان با موفقیت انجام شد"
        } else message = "نپسندیدن گفتمان لغو شد"

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

   async showGaragesCoWorkingReqsForOutSourcingRequest(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

   async addAndChooseGarageToOutSourcingRequest(req, res, next){
    try {
        
    } catch (error) {
        
    }
}


   async getCommentsOfBoronNotice(req, res, next){
    try {
        const {boronnoticeID} = req.params;
        await this.findBoronNoticeById(boronnoticeID);
        const post = await AgahiBoronseparisModel.findOne({_id: boronnoticeID})
        .populate({
            path: "comments",
            select: "comment answers -_id",
        })
        .select("comments")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                post
            }
        })
    } catch (error) {
        next(error)
    }
   }

  
async addRequestedGarageCommentAndRateForBoronNotice(req, res, next){
    try {
        
    } catch (error) {
        
    }
}

async addAcceptedGarageCommentAndRateForBoronNotice(req, res, next){
    try {
        
    } catch (error) {
        
    }
}

async createInvoice_FactorForBoronNotice(req, res, next){
    try {
        
    } catch (error) {
        
    }
}

async addGarageToBoronNotice(req, res, next){
    try {
        
    } catch (error) {
        
    }
}


async shareBoronNotice(req, res, next){
    try {
        const {boronnoticeID} = req.params;
        await this.findBoronNoticeById(boronnoticeID);
        const post = await AgahiBoronseparisModel.findOne({_id: boronnoticeID},{})
        .populate([
            {path: "shareLink",} 
        ])
        .select("shareLink")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                post
            }
        })
    } catch (error) {
        next(error)
    }
   }

   //////////////////////////////////////////////////////////////////////////

   async findBoronNoticeById(boronnoticeID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: boronnoticeID });
    const post = await AgahiBoronseparisModel.findById(id);
    if (!post) throw new createError.NotFound("گفتمانی یافت نشد")
    return post
  }


  async getComment(model, id){
    const findedComment = await model.findOne({"comments._id": id},{"comments.$": 1});
    const comment = copyObjet(findedComment);
    if(!comment?.comments?.[0]) throw createError.NotFound("نظری با این مشخصات یافت نشد");
    return comment?.comments?.[0]
}


// این متد به‌صورت بازگشتی به دنبال پیدا کردن کامنت یا پاسخی با شناسه مورد نظر می‌گردد
async findCommentOrAnswer(comments, parentId) {
    for (let comment of comments) {
        // بررسی اگر کامنت یا پاسخ با شناسه parentId پیدا شد
        if (comment._id.equals(parentId)) {
            return comment;
        }

        // اگر پاسخ‌هایی وجود دارند، به صورت بازگشتی در پاسخ‌ها نیز جستجو کن
        if (comment.answers && comment.answers.length > 0) {
            const foundComment = await this.findCommentOrAnswer(comment.answers, parentId);
            if (foundComment) return foundComment;
        }
    }
    return null; // در صورت پیدا نکردن کامنت یا پاسخ
}


}

module.exports = {
    GarageAddBoronNoticeController: new GarageAddBoronNoticeController()
}