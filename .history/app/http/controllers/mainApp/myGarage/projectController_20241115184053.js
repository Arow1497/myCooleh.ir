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
const { getLink } = require("../../../../utils/functions");
const { ObjectIdValidator } = require("../../../validators/public.validator");

class GarageAddProjectController extends Controller{
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
    
    async #processAttachments(files, fileUploadPath, correlationType) {
        const attachments = [];
        
        // Process images
        const images = ListOfImagesFromRequest(files || [], fileUploadPath);
        for (const image of images) {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            attachments.push({
                url: image,
                filename: path.basename(image),
                fileType: 'image',
                fileSize: fileInfo?.size?.toString() || '0',
                mimeType: fileInfo?.mimetype || 'image/jpeg',
                dimensions: { width: 0, height: 0 },
                status: 'COMPLETED',
                CorrelationType: correlationType
            });
        }
        // Process voice files
        const voiceFiles = files?.voice || [];
        if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
                const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
                const voiceURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${voiceAddress}`;
                
                try {
                    const seconds = await getAudioDurationInSeconds(voiceURL);
                    attachments.push({
                        url: voiceAddress,
                        filename,
                        fileType: 'audio',
                        fileSize: voiceFiles[0].size.toString(),
                        mimeType: voiceFiles[0].mimetype,
                        duration: getTime(seconds),
                        status: 'COMPLETED',
                        CorrelationType: correlationType
                    });
                } catch (error) {
                    console.error("Error processing audio file:", error);
                }
            }
        }
        // Process video files
        const videoFiles = files?.video || [];
        if (Array.isArray(videoFiles) && videoFiles.length > 0) {
        const { fileUploadPath } = body;
        const filename = videoFiles[0].filename;
        
        if (filename && fileUploadPath) {
            const videoAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
            const videoURL = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${videoAddress}`;
            
            try {
            const seconds = await getVideoDurationInSeconds(videoURL);
            const duration = getTime(seconds);
            
            attachments.push({
                url: videoAddress,
                filename: filename,
                fileType: 'video',
                fileSize: videoFiles[0].size.toString(),
                mimeType: videoFiles[0].mimetype,
                duration: duration,
                status: 'COMPLETED',
                // Add required relations with appropriate IDs
                noticeApprenticeId: process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID,
            });
            } catch (error) {
            console.error("Error calculating video duration:", error);
            }
        }
        }
    
        return attachments;
    }
  
  // Controller methods

    async createNewProject(req, res, next){
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
            const createProject = await ProjectsModel.create({
            garageID,
            clientID,
            status: "accepted",
            partSupplyStatus: "notAdd",
            chassisNumber,
            plateNumber,
            car,
            price,
            images,
            mechanicsTeam,
            clientAndMechanicVoices,
            })
    } catch (error) {
        next(error)
    }
    }

    async removeProjectById(req, res, next){
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

    async editProjectById(req, res, next) {
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

    async getAllOfGarageProjects(req, res, next){
    try {
        const {search} = req.query;
        let post;
        const {category} = req.query;
        const findQuery = category? {category} : {}
        
        if(search) post = await PostsModel
        .find({$text : {$search : search}})
        .populate([
            {path: "category", select: {title: 1}},
            {path: "publisher", select: {first_name: 1, last_name:1, mobile:1}}
        ])
        .sort({_id : -1})
        else  post =  await PostsModel.find(findQuery).populate([
            {path : "publisher", select: {first_name: 1, last_name:1, mobile:1,}}, 
            {path: "category"},
            {path: "comments.from_user"},
            {path: "likes"},
            {path: "dislikes"},
            {path: "bookmarks"},
        ]);

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

    async LikeProject(req, res, next){
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

    async dislikeProject(req, res, next){
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

    async getCommentsOfProject(req, res, next){
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

    async addClientCommentAndRateForProject(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async addGarageCommentAndRateForProject(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async createInvoice_FactorForProject(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async createOilAutoServiceProject(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async shareProject(req, res, next){
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

   ///////////////////////////////////////////////////////////////////
   async findProjectById(projectID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: projectID });
    const project = await prisma.project.findUnique({where: {id}});
    if (!project) throw new createError.NotFound("گفتمانی یافت نشد")
    return project
  }

  
}

module.exports = {
    GarageAddProjectController: new GarageAddProjectController()
}