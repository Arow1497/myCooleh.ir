//سیستمی که در اون مکانیک ها بخصوص شاگرد ها از مراحلی که انجام دادن و پروسه هایی 
// که انجام دادن در پروژه توضیحات امل همراه با عکس میزارند و سازوکار پیشرفت پروژه 
//کاملا مشخص و توسط مدیر گاراژ قابل پیگیری هست 

const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const path = require('path');
const prisma = new PrismaClient();
const { audioSeconds, getTime, ListOfImagesFromRequest } = require("../../../../utils/functions");


class InGarageProcessFollowUpController extends Controller{
 // Private helper methods
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

}

module.exports = {
    InGarageProcessFollowUpController: new InGarageProcessFollowUpController()
}