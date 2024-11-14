const createError = require("http-errors");
const { ProductSuppliersModel } = require("../../../models/PartSupplier.js/agahi.shop.supplier");
const Controller = require("../controller");


class SupplierStoreProductController extends Controller{

//ما دو نوع تامین کننده داریم در صنف یدکی یا روغن یکی اونها که مکان ثابت دارند 
//و یکی اونخا که بصورت فریلنسری روغن یا قطعه تامینن میکنند
    async createProduct(req, res, next){
        try {
            await CreateProductSchema.validateAsync(req.body);
             const{title, description, category, type, tags, price} = req.body;
             const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
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
           const createProduct = await ProductSuppliersModel.create({
            title,
            description,
            publisher,
            type,
            category,
            price,
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
            deleteFilesInPublicForProducts(req.files);
                    next(error)
        }
       }

   async removeProductById(req, res, next){
    try {
        const {productID} = req.params;
        const applicantID = req.user._id;  // ایدی درخواست دهنده
    // پیدا کردن پست و اطمینان از موجودیت آن
    const product = await this.findProductById(productID)
    // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
    if (!product.publisher.equals(applicantID)) {
        throw createError.NotAcceptable("ویرایش گفتمان فقط برای ناشر آن مجاز است");
      }
           const removeProductResult = await ProductSuppliersModel.deleteOne({ _id: product._id });
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

   async editProductById(req, res, next) {
    try {
        await UpdateProductSchema.validateAsync(req.body);
        const { productID } = req.params;
        console.log(productID);
        const applicantID = req.user._id;
        // پیدا کردن پست و اطمینان از موجودیت آن
        const product = await this.findProductById(productID)
        // بررسی مالکیت پست توسط کاربر درخواست‌دهنده
        if (!product.publisher.equals(applicantID)) {
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
            "shareLink"
        ];
        // پردازش فایل‌های تصاویر
        const images = ListOfImagesFromRequest(req?.files || [], req.body.fileUploadPath);
        (images.length > 0) ? data.images = images : blackListFields.push("images");
        
        // حذف فیلدهای نامعتبر از داده‌های ورودی
        deleteInvalidPropertyInObject(data, blackListFields);

        const updateProductResult = await ProductSuppliersModel.updateOne({ _id: product._id }, { $set: data });
        if (!updateProductResult.modifiedCount) {
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
        deleteFilesInPublicForProducts(req.files);
        next(error);
    }
}


   async getAllProducts(req, res, next){
    try {
        const {search} = req.query;
        const {category} = req.query;
        let product;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
        product = await ProductSuppliersModel.find(query)
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
                product
            }
        })
    } catch (error) {
        next(error)
    }
   }


   async getListOfProducts(req, res, next){
    try {
        const applicantID = req.user._id;  // ایدی درخواست دهنده
       const product = await ProductSuppliersModel.find({"publishere": applicantID}).populate([
        {path: "category", select: {children: 0, prent: 0}},
        {path: "publisher", select: {first_name: 1, last_name:1, mobile:1,}}
       ]).sort({_id : -1});
    } catch (error) {
        next(error)
    }
   } // دیدن پست های خودش --یدکی

   async getOneProductById(req, res, next){
    try {
        const { productID } = req.params;
        const product = await this.findProductById(productID);
        if(!product) throw createHttpError.NotFound("چنین گفتمانی یافت نشد");
        product.views += 1;
        await product.save();
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data : {
            product
          }
        })
    } catch (error) {
        next(error)
    }
   }

   
   async BookmarkProduct(req, res, next){
    try {
        const user = req.user._id;
        const {productID} = req.parms;
        await this.findProductById(productID);
        let BookmarkedProduct = await ProductSuppliersModel.findOne({
            _id: productID,
            bookmarks : user._id
        })
        const updateQuery = BookmarkedProduct? {$pull:{bookmarks: user._id}} : {$push: {bookmarks: user._id}}
        await ProductSuppliersModel.updateOne({ _id: productID }, updateQuery)
        let message
        if(!BookmarkedProduct){ 
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

   async LikeProduct(req, res, next){
    try {
        const user = req.user._id;
        const {productID} = req.params;
        await findProductById(productID);
        let likedProduct = await ProductSuppliersModel.findOne({
            _id: productID,
            likes : user._id
        })
        let disLikedProduct = await ProductSuppliersModel.findOne({
            _id: productID,
            dislike : user._id
        })
        const updateQuery = likedProduct? {$pull:{likes: user._id}} : {$push: {likes: user._id}}
        await ProductSuppliersModel.updateOne({ _id: productID }, updateQuery)
        let message
        if(!likedProduct){
            if(disLikedProduct) await ProductSuppliersModel.updateOne({ _id: productID }, {$pull: {dislike: user._id}})
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

   async dislikeProduct(req, res, next){
    try {
        const user = req.user._id;
        const {productID} = req.params;
        await findProductById(productID)
        let likedproduct = await ProductSuppliersModel.findOne({
            _id: productID,
            likes : user._id
        })
        let disLikedproduct = await ProductSuppliersModel.findOne({
            _id: productID,
            dislikes : user._id
        })
        const updateQuery = disLikedproduct? {$pull:{dislikes: user._id}} : {$push: {dislikes: user._id}}
        await ProductSuppliersModel.updateOne({ _id: productID }, updateQuery)
        let message
        if(!disLikedproduct){
            if(likedproduct) await ProductSuppliersModel.updateOne({ _id: productID }, {$pull: {likes: user._id}})
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


   async getCommentsOfProduct(req, res, next){
    try {
        const {productID} = req.params;
        await this.findProductById(productID);
        const product = await ProductSuppliersModel.findOne({_id: productID})
        .populate({
            path: "comments",
            select: "comment answers -_id",
        })
        .select("comments")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                product
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async addCommentForProduct(req, res, next) {
    try {
        const user = req.user;
        const { productID } = req.params;
        const { comment, parent } = req.body;

        // اعتبارسنجی شناسه پست
        if (!mongoose.isValidObjectId(productID)) throw createError.BadGateway("شناسه گفتمان ارسال شده صحیح نمی‌باشد");
        const product = await this.findProductById(productID);
        if (!product) throw createError.NotFound("پست یافت نشد");

        // اگر parent وجود دارد، یعنی قصد ثبت پاسخ به یک کامنت یا پاسخ داریم
        if (parent && mongoose.isValidObjectId(parent)) {
            const commentDocument = await this.findCommentOrAnswer(product.comments, parent);
            if (!commentDocument) throw createError.NotFound("کامنت یا پاسخی با این شناسه یافت نشد");
            if (!commentDocument.openToComment) throw createError.BadRequest("ثبت پاسخ مجاز نیست");

            // اضافه کردن پاسخ به کامنت یا پاسخ مورد نظر
            commentDocument.answers.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });

            await product.save(); // ذخیره تغییرات
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما با موفقیت ثبت شد"
                }
            });
        } else {
            // در صورتی که parent وجود نداشته باشد، یک کامنت جدید ثبت می‌شود
            product.comments.push({
                comment,
                from_user: user._id,
                show: true,
                openToComment: true
            });
            await product.save(); // ذخیره تغییرات
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


   async shareProduct(req, res, next){
    try {
        const {productID} = req.params;
        await this.findProductById(productID);
        const product = await ProductSuppliersModel.findOne({_id: productID},{})
        .populate([
            {path: "shareLink",} 
        ])
        .select("shareLink")
        .exec();
        
      
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data : {
                product
            }
        })
    } catch (error) {
        next(error)
    }
   }

   async reportProduct(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }
   async purchaseVideoProduct(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }

   async addProductToBasket(req, res, next){
    try {
        
    } catch (error) {
        next(error)
    }
   }


}

module.exports = {
    SupplierStoreProductController: new SupplierStoreProductController()
}