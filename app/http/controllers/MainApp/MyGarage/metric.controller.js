const createError = require("http-errors");
const Controller = require("../../controller");
const { default: mongoose } = require("mongoose");
const { getLink } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const { MetricsModel } = require("../../../../models/Mechanics-Garages/metrics");


class GarageMetricsController extends Controller{

   async createMetric(req, res, next){
    try {
        await CreateMetricSchema.validateAsync(req.body);
        const{title, description, category, price, metricPrice} = req.body;
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        const publisher = req.user._id;
        const garageID = req?.user?.garageID;
        // if(!garageID) throw createError.NotAcceptable("ثبت متریک فقط بعد از ثبت یدکی امکانپذیر است");
        const nearBy = req.user.supplierStoreLat_Lng;
        const generatedSerial = getLink(garageID);
        const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`
        const createMetric = await MetricsModel.create({
         publisher,
         title,
         description,
         category,
         garageID,
         images,
         metricPrice,
         shareLink,
         price,
         nearBy
       })
       return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
     data: {
        message: "ثبت متریک با موفقیت انجام شد"
         }
       });
    } catch (error) {
          deleteFileInPublic(req.files);
             next(error)
         }
   }


   async removeMetricById(req, res, next){
    try {
        const {metricID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const metric = await this.findMetricById(metricID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!metric.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("حذف متریک فقط برای ناشر آن مجاز است");
      }
           const removeMetricResult = await MetricsModel.deleteOne({ _id: metric._id });
           if (!removeMetricResult.deletedCount) throw createError.InternalServerError("حذف متریک انجام نشد");
       
       return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data : {
          message: "حذف متریک با موفقیت انجام شد"
        }
      })
    } catch (error) {
        next(error)
    }
   }

   async editMetricById(req, res, next){
    try {
        await UpdateMetricSchema.validateAsync(req.body);
        const { metricID } = req.params;
        const applicantID = req.user._id;
        // پیدا کردن پست و اطمینان از موجودیت آن
        const metric = await this.findMetricById(metricID)
        // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
        if (!metric.publisher.equals(applicantID)) {
            throw createError.NotAcceptable("ویرایش متریک فقط برای ناشر آن مجاز است");
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

        const updateMetricResult = await MetricsModel.updateOne({ _id: metric._id }, { $set: data });
        if (!updateMetricResult.modifiedCount) {
            throw createError.InternalServerError("بروزرسانی متریک انجام نشد");
        }
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "به روز رسانی متریک  با موفقیت انجام شد"
            }
        });
    } catch (error) {
        // در صورت بروز خطا، فایل‌های آپلود شده حذف می‌شوند
        deleteFileInPublic(req.files);
        next(error);
    }
   }

   async getAllMetrics(req, res, next){
    try {
        const {search} = req.query;
        const {category} = req.query;
        let metric;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
        metric = await MetricsModel.find(query)
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
                metric
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async addMetricByIdToCooleh(req, res, next){
    try {
        const suplierStoreID = req.user.suplierStoreID;
        const {metricID} = req.parms;
        await this.findMetricById(metricID);

  let AddMetric = await MetricsModel.findOne({
            _id: metricID,
            suplierStoreID : suplierStoreID
        })
        const updateQuery = AddMetric? {$pull:{suplierStoreID: suplierStoreID}} : {$push: {suplierStoreID: suplierStoreID}}
        await MetricsModel.updateOne({ _id: metricID }, updateQuery)
        let message
        if(!AddMetric){ 
            message = "متریک به کوله شما اضافه شد"
        } else message = "متریک از کوله شما حذف شد"

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

   async getListOfMetrics(req, res, next){
    try {
        const applicantID = req.user._id;  // ایدی درخواست دهنده
       const metric = await MetricsModel.find({"publisher": applicantID}).populate([
        {path: "category", select: {children: 0, prent: 0}},
        {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
       ]).sort({_id : -1});
    } catch (error) {
        next(error)
    }
   } // دیدن اگهی های خودش --یدکی

   async getOneMetricById(req, res, next){
    try {
        const { metricID } = req.params;
        const metric = await this.findMetricById(metricID);
         if(!metric) throw createHttpError.NotFound("چنین متریکی یافت نشد");
         metric.views += 1;
         await metric.save();
         return res.status(HttpStatus.OK).json({
           statusCode: HttpStatus.OK,
           data : {
            metric
           }
         })
    } catch (error) {
        next(error)
    }
   }
 
   async getCommentsOfMetric(req, res, next){
    try {
        const {metricID} = req.params;
        await this.findMetricById(metricID);
        const metric = await MetricsModel.findOne({_id: metricID})
        .populate({
            path: "comments",
            select: "comment answers -_id",
        })
        .select("comments")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                metric
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async addCommentsForMetric(req, res, next){
    try {
        const user = req.user;
        const { metricID } = req.params;
        const { comment, parent } = req.body;

        // اعتبارسنجی شناسه پست
        if (!mongoose.isValidObjectId(metricID)) throw createError.BadGateway("شناسه متریک ارسال شده صحیح نمی‌باشد");
        const metric = await this.findMetricById(metricID);
        if (!metric) throw createError.NotFound("متریک یافت نشد");

        // اگر parent وجود دارد، یعنی قصد ثبت پاسخ به یک کامنت یا پاسخ داریم
        if (parent && mongoose.isValidObjectId(parent)) {
            const commentDocument = await this.findCommentOrAnswer(metric.comments, parent);
            if (!commentDocument) throw createError.NotFound("کامنت یا پاسخی با این شناسه یافت نشد");
            if (!commentDocument.openToComment) throw createError.BadRequest("ثبت پاسخ مجاز نیست");

            // اضافه کردن پاسخ به کامنت یا پاسخ مورد نظر
            commentDocument.answers.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });

            await metric.save(); // ذخیره تغییرات
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما با موفقیت ثبت شد"
                }
            });
        } else {
            // در صورتی که parent وجود نداشته باشد، یک کامنت جدید ثبت می‌شود
            metric.comments.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });
            await metric.save(); // ذخیره تغییرات
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

   async likeMetric(req, res, next){
    try {
        const user = req.user._id;
        const {metricID} = req.params;
        await findMetricById(metricID);
        let likedmetric = await MetricsModel.findOne({
            _id: metricID,
            likes : user._id
        })
        let dislikedmetric = await MetricsModel.findOne({
            _id: metricID,
            dislike : user._id
        })
        const updateQuery = likedmetric? {$pull:{likes: user._id}} : {$push: {likes: user._id}}
        await MetricsModel.updateOne({ _id: metricID }, updateQuery)
        let message
        if(!likedmetric){
            if(dislikedmetric) await MetricsModel.updateOne({ _id: metricID }, {$pull: {dislike: user._id}})
            message = "پسندیدن متریک با موفقیت انجام شد"
        } else message = "پسندیدن متریک لغو شد"
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

   async dislikeMetric(req, res, next){
    try {
        const user = req.user._id;
        const {metricID} = req.params;
        await findMetricById(metricID)
        let likedmetric = await MetricsModel.findOne({
            _id: metricID,
            likes : user._id
        })
        let dislikedmetric = await MetricsModel.findOne({
            _id: metricID,
            dislikes : user._id
        })
        const updateQuery = dislikedmetric? {$pull:{dislikes: user._id}} : {$push: {dislikes: user._id}}
        await MetricsModel.updateOne({ _id: metricID }, updateQuery)
        let message
        if(!dislikedmetric){
            if(likedmetric) await MetricsModel.updateOne({ _id: metricID }, {$pull: {likes: user._id}})
            message = "نپسندیدن متریک با موفقیت انجام شد"
        } else message = "نپسندیدن متریک لغو شد"

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

   async BookmarkMetric(req, res, next){
    try {
        const user = req.user._id;
        const {metricID} = req.parms;
        await this.findMetricById(metricID);
        let BookmarkedMetric = await MetricsModel.findOne({
            _id: metricID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedMetric? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await MetricsModel.updateOne({ _id: metricID }, updateQuery)
        let message
        if(!BookmarkedMetric){ 
            message = "متریک به علاقه مندی های شما اضافه شد"
        } else message = "متریک از علاقه مندی های شما حذف شد"

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


   async shareMetric(req, res, next){
    try {
        const {metricID} = req.params;
        await this.findMetricById(metricID);
        const metric = await MetricsModel.findOne({_id: metricID},{})
        .populate([
            {path: "shareLink",} 
        ])
        .select("shareLink")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                metric
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async peleMetricById(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }// فرستادن اگهی به صدر--بعدا پولی میشه

   async successSellMetricById(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }// عملیات فروش موفق یدکی با این متریک


   //////////////////////////////////////////////////////////////////////////////////
   async findMetricById(metricID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: metricID });
    const metric = await MetricsModel.findById(id);
    if (!metric) throw new createError.NotFound("متریک موردنظر یافت نشد")
    return metric
  }

  async getComment(model, id){
    const findedComment = await model.findOne({"comments._id": id},{"comments.$": 1});
    const comment = copyObjet(findedComment);
    if(!comment?.comments?.[0]) throw createError.NotFound("نظری با این مشخصات یافت نشد");
    return comment?.comments?.[0]
}

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
    GarageMetricsController: new GarageMetricsController()
}


