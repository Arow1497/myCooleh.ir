const createError = require("http-errors");
const Controller = require("../../controller");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { PostsModel } = require("../../../../models/Mechanics-Garages/posts");
const { getTime, ListOfImagesFromRequest, deleteFilesInPublicForPosts,
 copyObjet, deleteInvalidPropertyInObject, getLink, } = require("../../../../utils/functions");
const { default: getVideoDurationInSeconds } = require("get-video-duration");
const path = require("path");
const { CreatePostSchema, UpdatePostSchema } = require("../../../validators/MainApp/post.schema");
const { GaragesModel } = require("../../../../models/Garages/garage");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const { default: mongoose } = require("mongoose");

class ForumPostsController extends Controller{

   async createPost(req, res, next){
    try {
        await CreatePostSchema.validateAsync(req.body);
         const{title, description, category, type, tags, price, videoFilename, fileUploadPath} = req.body;
         const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
         const videoAddress = path.join(fileUploadPath, videoFilename).replace(/\\/gi, "/");
         const videoUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`
         const seconds = await getVideoDurationInSeconds(videoUrl);
         const time = getTime(seconds);
         const publisher = req.user._id;
        let field;
        const garageID = req.user.garageID;
        if(garageID){ const findGarage = await GaragesModel.findById(garageID);
             field = findGarage.garageMainField;
        }else{
           field = "allKinds";
        }
        const generatedSerial = getLink(publisher);
       const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`
    console.log(shareLink);
       const createPost = await PostsModel.create({
        title,
        description,
        publisher,
        type,
        category,
        price,
        videoAddress,
        time,
        tags,
        field,
        shareLink,
        images,
      })
      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data: {
          message: "ثبت گفتمان با موفقیت انجام شد"
        }
    });
    } catch (error) {
        console.log(error);
        deleteFilesInPublicForPosts(req.files);
                next(error)
    }
   }

   async removePostById(req, res, next){
    try {
        const {postID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const post = await this.findPostById(postID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!post.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("ویرایش گفتمان فقط برای ناشر آن مجاز است");
      }
           const removeProductResult = await PostsModel.deleteOne({ _id: post._id });
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

   async editPostById(req, res, next) {
    try {
        await UpdatePostSchema.validateAsync(req.body);
        const { postID } = req.params;
        console.log(postID);
        const applicantID = req.user._id;
        // پیدا کردن پست و اطمینان از موجودیت آن
        const post = await this.findPostById(postID)
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

        const updatePostResult = await PostsModel.updateOne({ _id: post._id }, { $set: data });
        if (!updatePostResult.modifiedCount) {
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
        deleteFilesInPublicForPosts(req.files);
        next(error);
    }
}


   async getAllPosts(req, res, next){
    try {
        const {search} = req.query;
        const {category} = req.query;
        let post;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
        post = await PostsModel.find(query)
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
        });
    } catch (error) {
        next(error)
    }
   }


   async getListOfPosts(req, res, next){
    try {
        const applicantID = req.user._id;  // ایدی درخواست دهنده
       const post = await PostsModel.find({"publishere": applicantID}).populate([
        {path: "category", select: {children: 0, prent: 0}},
        {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
       ]).sort({_id : -1});
    } catch (error) {
        next(error)
    }
   } // دیدن پست های خودش --یدکی

   async getOnePostById(req, res, next){
    try {
        const { postID } = req.params;
        const post = await this.findPostById(postID);
        if(!post) throw createHttpError.NotFound("چنین گفتمانی یافت نشد");
        post.views += 1;
        await post.save();
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

   
   async BookmarkPost(req, res, next){
    try {
        const user = req.user._id;
        const {postID} = req.parms;
        await this.findPostById(postID);
        let BookmarkedPost = await PostsModel.findOne({
            _id: postID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedPost? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await PostsModel.updateOne({ _id: postID }, updateQuery)
        let message
        if(!BookmarkedPost){ 
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

   async LikePost(req, res, next){
    try {
        const user = req.user._id;
        const {postID} = req.params;
        await findPostById(postID);
        let likedPost = await PostsModel.findOne({
            _id: postID,
            likes : user._id
        })
        let disLikedPost = await PostsModel.findOne({
            _id: postID,
            dislike : user._id
        })
        const updateQuery = likedPost? {$pull:{likes: user._id}} : {$push: {likes: user._id}}
        await PostsModel.updateOne({ _id: postID }, updateQuery)
        let message
        if(!likedPost){
            if(disLikedPost) await PostsModel.updateOne({ _id: postID }, {$pull: {dislike: user._id}})
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

   async dislikePost(req, res, next){
    try {
        const user = req.user._id;
        const {postID} = req.params;
        await findPostById(postID)
        let likedpost = await PostsModel.findOne({
            _id: postID,
            likes : user._id
        })
        let disLikedpost = await PostsModel.findOne({
            _id: postID,
            dislikes : user._id
        })
        const updateQuery = disLikedpost? {$pull:{dislikes: user._id}} : {$push: {dislikes: user._id}}
        await PostsModel.updateOne({ _id: postID }, updateQuery)
        let message
        if(!disLikedpost){
            if(likedpost) await PostsModel.updateOne({ _id: postID }, {$pull: {likes: user._id}})
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


   async getCommentsOfPost(req, res, next){
    try {
        const {postID} = req.params;
        await this.findPostById(postID);
        const post = await PostsModel.findOne({_id: postID})
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

   async addCommentForPost(req, res, next) {
    try {
        const user = req.user;
        const { postID } = req.params;
        const { comment, parent } = req.body;

        // اعتبارسنجی شناسه پست
        if (!mongoose.isValidObjectId(postID)) throw createError.BadGateway("شناسه گفتمان ارسال شده صحیح نمی‌باشد");
        const post = await this.findPostById(postID);
        if (!post) throw createError.NotFound("پست یافت نشد");

        // اگر parent وجود دارد، یعنی قصد ثبت پاسخ به یک کامنت یا پاسخ داریم
        if (parent && mongoose.isValidObjectId(parent)) {
            const commentDocument = await this.findCommentOrAnswer(post.comments, parent);
            if (!commentDocument) throw createError.NotFound("کامنت یا پاسخی با این شناسه یافت نشد");
            if (!commentDocument.openToComment) throw createError.BadRequest("ثبت پاسخ مجاز نیست");

            // اضافه کردن پاسخ به کامنت یا پاسخ مورد نظر
            commentDocument.answers.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });

            await post.save(); // ذخیره تغییرات
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما با موفقیت ثبت شد"
                }
            });
        } else {
            // در صورتی که parent وجود نداشته باشد، یک کامنت جدید ثبت می‌شود
            post.comments.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });
            await post.save(); // ذخیره تغییرات
        }

        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "ثبت نظر با موفقیت انجام شد"
            }
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
}


   async sharePost(req, res, next){
    try {
        const {postID} = req.params;
        await this.findPostById(postID);
        const post = await PostsModel.findOne({_id: postID},{})
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

   async reportPost(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }
   async purchaseVideoPost(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

//////////////////////////////////////////////////////////////////////////////////

async findPostById(postID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: postID });
    const post = await PostsModel.findById(id);
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
    ForumPostsController: new ForumPostsController()
}