const createError = require("http-errors");
const Controller = require("../../controller");
const { AgahiDivarsModel } = require("../../../../models/Mechanics-Garages/agahi.Divar.forum");
const { CreateDNoticeSchema, UpdateDNoticeSchema } = require("../../../validators/MainApp/dnotice.schema");
const { deleteFileInPublic } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");


class ForumAgahiDivarController extends Controller{

   async createNotice(req, res, next){
    try {
         await CreateDNoticeSchema.validateAsync(req.body);
           const{title, description, category, price,} = req.body;
           const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
           const publisher = req.user._id;
           const garageID = req?.user?.garageID;
           const generatedSerial = getLink(publisher);
           const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`
          const createDNotice = await AgahiDivarsModel.create({
            title,
            description,
            publisher,
            category,
            images,
            garageID,
            shareLink,
            price,
          })
          return res.status(HttpStatus.CREATED).json({
           statusCode: HttpStatus.CREATED,
        data: {
           message: "ثبت آگهی با موفقیت انجام شد"
            }
          });
       } catch (error) {
             console.log(error);
             deleteFileInPublic(req.files);
                next(error)
            }
           }
   

   async removeNoticeById(req, res, next){
    try {
        const {dnoticeID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const dNotice = await this.findDNoticeById(dnoticeID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!post.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("ویرایش آگهی فقط برای ناشر آن مجاز است");
      }
           const removeProductResult = await AgahiDivarsModel.deleteOne({ _id: dNotice._id });
           if (!removeProductResult.deletedCount) throw createError.InternalServerError("حذف آگهی انجام نشد");
       
       return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data : {
          message: "حذف آگهی با موفقیت انجام شد"
        }
      })
    } catch (error) {
        console.log(error);
        next(error)
    }
   }

   async editNoticeById(req, res, next){
        try {
            await UpdateDNoticeSchema.validateAsync(req.body);
            const { dnoticeID } = req.params;
            const applicantID = req.user._id;
            // پیدا کردن پست و اطمینان از موجودیت آن
            const DNotice = await this.findDNoticeById(dnoticeID)
            // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
            if (!DNotice.publisher.equals(applicantID)) {
                throw createError.NotAcceptable("ویرایش گفتمان فقط برای ناشر آن مجاز است");
            }
            // کپی داده‌های ارسالی
            let data = copyObjet(req.body);
            let blackListFields = [
                "_id",
                "bookmarks",
                "publisher",
                "shareLink",
                "garageID",
                "views"
            ];
            // پردازش فایل‌های تصاویر
            const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
            (images.length > 0) ? data.images = images : blackListFields.push("images");
    
            // حذف فیلدهای نامعتبر از داده‌های ورودی
            deleteInvalidPropertyInObject(data, blackListFields);
    
            const updateDNoticeResult = await AgahiDivarsModel.updateOne({ _id: DNotice._id }, { $set: data });
            if (!updateDNoticeResult.modifiedCount) {
                throw createError.InternalServerError("بروزرسانی آگهی انجام نشد");
            }
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "به روز رسانی آگهی  با موفقیت انجام شد"
                }
            });
        } catch (error) {
            // در صورت بروز خطا، فایل‌های آپلود شده حذف می‌شوند
            deleteFileInPublic(req.files);
            next(error);
        }
    } 

   async getAllNotices(req, res, next){
    try {
        const {search} = req.query;
        const {category} = req.query;
        let DNotice;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
        DNotice = await AgahiDivarsModel.find(query)
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
                DNotice
            }
        })
    } catch (error) {
        next(error)
    }
   }


   async getListOfNotices(req, res, next){
    try {
        const applicantID = req.user._id;  // ایدی درخواست دهنده
       const DNotice = await AgahiDivarsModel.find({"publishere": applicantID}).populate([
        {path: "category", select: {children: 0, prent: 0}},
        {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
       ]).sort({_id : -1});
    } catch (error) {
        next(error)
    }
   } // دیدن پست های خودش --یدکی

   async getOneNoticeById(req, res, next){
    try {
        const { dnoticeID } = req.params;
       const DNotice = await this.findDNoticeById(dnoticeID);
        if(!DNotice) throw createHttpError.NotFound("چنین گفتمانی یافت نشد");
        DNotice.views += 1;
        await DNotice.save();
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data : {
            DNotice
          }
        })
    } catch (error) {
        next(error)
    }
   }
 

   async BookmarkNotice(req, res, next){
    try {
        const user = req.user._id;
        const {dnoticeID} = req.parms;
        await this.findDNoticeById(dnoticeID);
        let BookmarkedDNotice = await AgahiDivarsModel.findOne({
            _id: dnoticeID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedDNotice? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await AgahiDivarsModel.updateOne({ _id: dnoticeID }, updateQuery)
        let message
        if(!BookmarkedDNotice){ 
            message = "آگهی به علاقه مندی های شما اضافه شد"
        } else message = "آگهی از علاقه مندی های شما حذف شد"

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


   async shareNotice(req, res, next){
    try {
        const {dnoticeID} = req.params;
        await this.findDNoticeById(dnoticeID);
        const DNotice = await AgahiDivarsModel.findOne({_id: dnoticeID},{})
        .populate([
            {path: "shareLink",} 
        ])
        .select("shareLink")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                DNotice
            }
        })
    } catch (error) {
        next(error)
    }
   }


   async pellehToUpNotice(req, res, next){
    try {
   
    } catch (error) {
        next(error)
    }
   }

   //////////////////////////////////////////////////////////////////////////////////
   async findDNoticeById(dnoticeID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: dnoticeID });
    const dnotice = await AgahiDivarsModel.findById(id);
    if (!dnotice) throw new createError.NotFound("H'id یافت نشد")
    return dnotice
  }

}
  

module.exports = {
    ForumAgahiDivarController: new ForumAgahiDivarController()
}