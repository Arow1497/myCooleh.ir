const createError = require("http-errors");
const Controller = require("../../controller");
const { AgahiEstNiazModel } = require("../../../../models/Mechanics-Garages/agahi.Est_Niaz");
const { CreateDNoticeSchema, UpdateDNoticeSchema } = require("../../../validators/MainApp/dnotice.schema");
const { deleteFileInPublic } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");

class ForumAgahiEstNiazController extends Controller{

    async createNotice(req, res, next){
        try {
             await CreateDNoticeSchema.validateAsync(req.body);
               const{title, description, category, price,} = req.body;
               const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
               const publisher = req.user._id;
               const garageID = req?.user?.garageID;
               const generatedSerial = getLink(publisher);
               const shareLink = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${generatedSerial}`
              const createENotice = await AgahiEstNiazModel.create({
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
            const {enoticeID} = req.params;
            const applicantID = req.user._id;  // ایدی درخواست دهنده
        // پیدا کردن پست و اطمینان از موجودیت آن
        const ENotice = await this.findENoticeById(enoticeID)
        // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
        if (!post.publisher.equals(applicantID)) {
            throw createError.NotAcceptable("ویرایش آگهی فقط برای ناشر آن مجاز است");
          }
               const removeProductResult = await AgahiEstNiazModel.deleteOne({ _id: ENotice._id });
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
                const { enoticeID } = req.params;
                const applicantID = req.user._id;
                // پیدا کردن پست و اطمینان از موجودیت آن
                const ENotice = await this.findENoticeById(enoticeID)
                // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
                if (!ENotice.publisher.equals(applicantID)) {
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
        
                const updateENoticeResult = await AgahiEstNiazModel.updateOne({ _id: ENotice._id }, { $set: data });
                if (!updateENoticeResult.modifiedCount) {
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
            let ENotice;
            let query;
            if(search) {
                query.$text = {$search: search};
            }
            if(category){
                query.category = category;
            }
            ENotice = await AgahiEstNiazModel.find(query)
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
                    ENotice
                }
            })
        } catch (error) {
            next(error)
        }
       }
    
    
       async getListOfNotices(req, res, next){
        try {
            const applicantID = req.user._id;  // ایدی درخواست دهنده
           const ENotice = await AgahiEstNiazModel.find({"publishere": applicantID}).populate([
            {path: "category", select: {children: 0, prent: 0}},
            {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
           ]).sort({_id : -1});
        } catch (error) {
            next(error)
        }
       } // دیدن پست های خودش --یدکی
    
       async getOneNoticeById(req, res, next){
        try {
            const { enoticeID } = req.params;
           const ENotice = await this.findENoticeById(enoticeID);
            if(!ENotice) throw createHttpError.NotFound("چنین گفتمانی یافت نشد");
            ENotice.views += 1;
            await ENotice.save();
            return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data : {
                ENotice
              }
            })
        } catch (error) {
            next(error)
        }
       }
     
    
       async BookmarkNotice(req, res, next){
        try {
            const user = req.user._id;
            const {enoticeID} = req.parms;
            await this.findENoticeById(enoticeID);
            let BookmarkedENotice = await AgahiEstNiazModel.findOne({
                _id: enoticeID,
                bookmarks : user._id
            })
            const updateQuery = BookmarkedENotice? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
            await AgahiEstNiazModel.updateOne({ _id: enoticeID }, updateQuery)
            let message
            if(!BookmarkedENotice){ 
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
            const {enoticeID} = req.params;
            await this.findENoticeById(enoticeID);
            const ENotice = await AgahiEstNiazModel.findOne({_id: enoticeID},{})
            .populate([
                {path: "shareLink",} 
            ])
            .select("shareLink")
            .exec();
            
          
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data : {
                    ENotice
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
       async findENoticeById(enoticeID) {
        const { id } = await ObjectIdValidator.validateAsync({ id: enoticeID });
        const enotice = await AgahiEstNiazModel.findById(id);
        if (!enotice) throw new createError.NotFound("H'id یافت نشد")
        return enotice
      }
    
}
  

module.exports = {
    ForumAgahiEstNiazController: new ForumAgahiEstNiazController()
}