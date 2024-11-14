const createError = require("http-errors");
const Controller = require("../../controller");
const { CreateDNoticeSchema, UpdateDNoticeSchema } = require("../../../validators/MainApp/dnotice.schema");
const { deleteFileInPublic } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const { AgahiTaminsModel } = require("../../../../models/Mechanics-Garages/agahi.taminGhete");


class ShopAgahiTaminPartsController extends Controller{

   async createNotice(req, res, next){
    try {
         await CreateDNoticeSchema.validateAsync(req.body);
           const{title, description, category, price,} = req.body;
           const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
           const publisher = req.user._id;
           const garageID = req?.user?.garageID;
           const generatedSerial = getLink(publisher);
           const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`
          const createTaminNotice = await AgahiTaminsModel.create({
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
        const {taminNoticeID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const taminNotice = await this.findtaminNoticeById(taminNoticeID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!post.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("ویرایش آگهی فقط برای ناشر آن مجاز است");
      }
           const removeProductResult = await AgahiTaminsModel.deleteOne({ _id: taminNotice._id });
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
            const { taminNoticeID } = req.params;
            const applicantID = req.user._id;
            // پیدا کردن پست و اطمینان از موجودیت آن
            const taminNotice = await this.findtaminNoticeById(taminNoticeID)
            // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
            if (!taminNotice.publisher.equals(applicantID)) {
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
            ];
            // پردازش فایل‌های تصاویر
            const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
            (images.length > 0) ? data.images = images : blackListFields.push("images");
    
            // حذف فیلدهای نامعتبر از داده‌های ورودی
            deleteInvalidPropertyInObject(data, blackListFields);
    
            const updatetaminNoticeResult = await AgahiTaminsModel.updateOne({ _id: taminNotice._id }, { $set: data });
            if (!updatetaminNoticeResult.modifiedCount) {
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
        let taminNotice;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
        taminNotice = await AgahiTaminsModel.find(query)
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
                taminNotice
            }
        })
    } catch (error) {
        next(error)
    }
   }


   async getListOfNotices(req, res, next){
    try {
        const applicantID = req.user._id;  // ایدی درخواست دهنده
       const taminNotice = await AgahiTaminsModel.find({"publishere": applicantID}).populate([
        {path: "category", select: {children: 0, prent: 0}},
        {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
       ]).sort({_id : -1});
    } catch (error) {
        next(error)
    }
   } // دیدن پست های خودش --یدکی

   async getOneNoticeById(req, res, next){
    try {
        const { taminNoticeID } = req.params;
       const taminNotice = await this.findtaminNoticeById(taminNoticeID);
        if(!taminNotice) throw createHttpError.NotFound("چنین گفتمانی یافت نشد");
        taminNotice.views += 1;
        await taminNotice.save();
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data : {
            taminNotice
          }
        })
    } catch (error) {
        next(error)
    }
   }
 

   async BookmarkNotice(req, res, next){
    try {
        const user = req.user._id;
        const {taminNoticeID} = req.parms;
        await this.findtaminNoticeById(taminNoticeID);
        let BookmarkedtaminNotice = await AgahiTaminsModel.findOne({
            _id: taminNoticeID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedtaminNotice? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await AgahiTaminsModel.updateOne({ _id: taminNoticeID }, updateQuery)
        let message
        if(!BookmarkedtaminNotice){ 
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
        const {taminNoticeID} = req.params;
        await this.findtaminNoticeById(taminNoticeID);
        const taminNotice = await AgahiTaminsModel.findOne({_id: taminNoticeID},{})
        .populate([
            {path: "shareLink",} 
        ])
        .select("shareLink")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                taminNotice
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
   async findtaminNoticeById(taminNoticeID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: taminNoticeID });
    const dnotice = await AgahiTaminsModel.findById(id);
    if (!dnotice) throw new createError.NotFound("H'id یافت نشد")
    return dnotice
  }

}
  

module.exports = {
    ShopAgahiTaminPartsController: new ShopAgahiTaminPartsController()
}