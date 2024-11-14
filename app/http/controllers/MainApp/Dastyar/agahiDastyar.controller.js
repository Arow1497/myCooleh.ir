const createError = require("http-errors");
const Controller = require("../../controller");
const { GaragesModel } = require("../../../../models/Garages/garage");
const { DastyarRequestsModel } = require("../../../../models/Garages/projects");
const { getLink } = require("../../../../utils/functions");


class GarageAddDastyarRequestController extends Controller{


   async createNewDastyarRequest(req, res, next){
    try {
        const publisher = req.user._id;
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
             const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`;
          const createDastyarRequest = await DastyarRequestsModel.create({
            garageID,
            clientID,
            status: "accepted",
            partSupplyStatus: "notAdd",
            chassisNumber,
            plateNumber,
            car,
            shareLink,
            price,
            images,
            mechanicsTeam,
            clientAndMechanicVoices,
            })
    } catch (error) {
        next(error)
    }
   }

   async removeDastyarRequestById(req, res, next){
    try {
        const {dastyarrequestID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const post = await this.findDastyarRequestById(dastyarrequestID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!post.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("ویرایش گفتمان فقط برای ناشر آن مجاز است");
      }
           const removeProductResult = await DastyarRequestsModel.deleteOne({ _id: post._id });
           if (!removeProductResult.deletedCount) throw createError.InternalServerError("حذف گفتمان انجام نشد");
       
       return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data : {
          message: "حذف گفتمان با موفقیت انجام شد"
        }
      })
    } catch (error) {
        console.log(error);
        next(error)
    }
   }

   async editDastyarRequestById(req, res, next) {
    try {
        await UpdateDastyarRequestSchema.validateAsync(req.body);
        const { dastyarrequestID } = req.params;
        console.log(dastyarrequestID);
        const applicantID = req.user._id;
        // پیدا کردن پست و اطمینان از موجودیت آن
        const post = await this.findDastyarRequestById(dastyarrequestID)
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

        const updateDastyarRequestResult = await DastyarRequestsModel.updateOne({ _id: post._id }, { $set: data });
        if (!updateDastyarRequestResult.modifiedCount) {
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
        deleteFilesInPublicForDastyarRequests(req.files);
        next(error);
    }
}


   async getAllOfGarageDastyarRequests(req, res, next){
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
   }

   async BookmarkDastyerRequest(req, res, next){
    try {
        const user = req.user._id;
        const {dastyarrequestID} = req.parms;
        await this.findDastyarRequestById(dastyarrequestID);
        let BookmarkedDastyerRequest = await DastyarRequestsModel.findOne({
            _id: dastyarrequestID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedDastyerRequest? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await DastyarRequestsModel.updateOne({ _id: dastyarrequestID }, updateQuery)
        let message
        if(!BookmarkedDastyerRequest){ 
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

   async LikeDastyarRequest(req, res, next){
    try {
        const user = req.user._id;
        const {dastyarrequestID} = req.params;
        await findDastyarRequestById(dastyarrequestID);
        let likedDastyarRequest = await DastyarRequestsModel.findOne({
            _id: dastyarrequestID,
            likes : user._id
        })
        let disLikedDastyarRequest = await DastyarRequestsModel.findOne({
            _id: dastyarrequestID,
            dislike : user._id
        })
        const updateQuery = likedDastyarRequest? {$pull:{likes: user._id}} : {$push: {likes: user._id}}
        await DastyarRequestsModel.updateOne({ _id: dastyarrequestID }, updateQuery)
        let message
        if(!likedDastyarRequest){
            if(disLikedDastyarRequest) await DastyarRequestsModel.updateOne({ _id: dastyarrequestID }, {$pull: {dislike: user._id}})
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

   async dislikeDastyarRequest(req, res, next){
    try {
        const user = req.user._id;
        const {dastyarrequestID} = req.params;
        await findDastyarRequestById(dastyarrequestID)
        let likedpost = await DastyarRequestsModel.findOne({
            _id: dastyarrequestID,
            likes : user._id
        })
        let disLikedpost = await DastyarRequestsModel.findOne({
            _id: dastyarrequestID,
            dislikes : user._id
        })
        const updateQuery = disLikedpost? {$pull:{dislikes: user._id}} : {$push: {dislikes: user._id}}
        await DastyarRequestsModel.updateOne({ _id: dastyarrequestID }, updateQuery)
        let message
        if(!disLikedpost){
            if(likedpost) await DastyarRequestsModel.updateOne({ _id: dastyarrequestID }, {$pull: {likes: user._id}})
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


   async getCommentsOfDastyarRequest(req, res, next){
    try {
        const {dastyarrequestID} = req.params;
        await this.findDastyarRequestById(dastyarrequestID);
        const post = await DastyarRequestsModel.findOne({_id: dastyarrequestID})
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

   async showMechanicsCoWorkingReqsForDastyarRequest(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

async addAndChooseMechanicToDastyarRequest(req, res, next){
    try {
        
    } catch (error) {
        
    }
}
  

async addMechanicCommentAndRateForDastyarRequest(req, res, next){
    try {
        
    } catch (error) {
        
    }
}

async addGarageCommentAndRateForMechanicInDastyarRequest(req, res, next){
    try {
        
    } catch (error) {
        
    }
}

async createInvoice_FactorForDastyarRequest(req, res, next){
    try {
        
    } catch (error) {
        
    }
}

async shareDastyarRequest(req, res, next){
    try {
        const {dastyarrequestID} = req.params;
        await this.findDastyarRequestById(dastyarrequestID);
        const post = await DastyarRequestsModel.findOne({_id: dastyarrequestID},{})
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

   ///////////////////////////////////////////////////////////////////
   async findDastyarRequestById(projectID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: projectID });
    const project = await DastyarRequestsModel.findById(id);
    if (!project) throw new createError.NotFound("گفتمانی یافت نشد")
    return project
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
    GarageAddDastyarRequestController: new GarageAddDastyarRequestController()
}