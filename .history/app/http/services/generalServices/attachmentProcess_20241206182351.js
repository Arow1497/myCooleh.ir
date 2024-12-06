const path = require("path");
const { getVideoDurationInSeconds } = require("get-video-duration");
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../../utils/functions");

class AttachmentProcessor {
    constructor(baseUrl, applicationPort) {
        this.baseUrl = baseUrl || process.env.BASE_URL;
        this.applicationPort = applicationPort || process.env.APPLICATION_PORT;
    }

    async processAttachments(files, fileUploadPath, correlationType) {
        const attachments = [];
        attachments.push(...this.#processImages(files, fileUploadPath, correlationType));
        attachments.push(...await this.#processVoiceFiles(files?.voice, fileUploadPath, correlationType));
        attachments.push(...await this.#processVideoFiles(files?.video, fileUploadPath, correlationType));
        return attachments;
    }

    #processImages(files, fileUploadPath, correlationType) {
        const images = ListOfImagesFromRequest(files || [], fileUploadPath);
        const attachments = [];
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
        return attachments;
    }

    async #processVoiceFiles(voiceFiles, fileUploadPath, correlationType) {
        const attachments = [];
        if (Array.isArray(voiceFiles) && voiceFiles.length > 0) {
            const filename = voiceFiles[0].filename;
            if (filename && fileUploadPath) {
                const voiceAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
                const voiceURL = `${this.baseUrl}:${this.applicationPort}/${voiceAddress}`;
                try {
                    const seconds = await audioSeconds(voiceURL);
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
        return attachments;
    }

    async #processVideoFiles(videoFiles, fileUploadPath, correlationType) {
        const attachments = [];
        if (Array.isArray(videoFiles) && videoFiles.length > 0) {
            const filename = videoFiles[0].filename;
            if (filename && fileUploadPath) {
                const videoAddress = path.join(fileUploadPath, filename).replace(/\\/g, "/");
                const videoURL = `${this.baseUrl}:${this.applicationPort}/${videoAddress}`;
                try {
                    const seconds = await getVideoDurationInSeconds(videoURL);
                    const duration = getTime(seconds);
                    attachments.push({
                        url: videoAddress,
                        filename,
                        fileType: 'video',
                        fileSize: videoFiles[0].size.toString(),
                        mimeType: videoFiles[0].mimetype,
                        duration: duration,
                        status: 'COMPLETED',
                        noticeApprenticeId: process.env.DEFAULT_NOTICEAPPRENTICESHIP_ID,
                    });
                } catch (error) {
                    console.error("Error calculating video duration:", error);
                }
            }
        }
        return attachments;
    }
}


class MediaProcessor {
    constructor(baseUrl, applicationPort) {
        this.baseUrl = baseUrl || process.env.BASE_URL;
        this.applicationPort = applicationPort || process.env.APPLICATION_PORT;
    }

    async processContentMedia(files, fileUploadPath, productId) {
        const mediaEntries = [];
        mediaEntries.push(...this.#processImages(files, fileUploadPath, productId));
        mediaEntries.push(...await this.#processAudioFiles(files?.audio, fileUploadPath, productId));
        mediaEntries.push(...await this.#processVideoFiles(files?.video, fileUploadPath, productId));
        return mediaEntries;
    }

    #processImages(files, fileUploadPath, productId) {
        const images = ListOfImagesFromRequest(files || [], fileUploadPath);
        const mediaEntries = [];
        for (const image of images) {
            const fileInfo = files.find(f => path.basename(image) === f.filename);
            mediaEntries.push({
                url: image,
                filename: path.basename(image),
                type: 'IMAGE',
                fileSize: fileInfo?.size?.toString() || '0',
                mimeType: fileInfo?.mimetype || 'image/jpeg',
                dimensions: { width: 0, height: 0 },  // Replace with actual dimensions if available
                status: 'COMPLETED',
                productId
            });
        }
        return mediaEntries;
    }

    async #processAudioFiles(audioFiles, fileUploadPath, productId) {
        const mediaEntries = [];
        if (Array.isArray(audioFiles) && audioFiles.length > 0) {
            const audioFile = audioFiles[0];
            const audioAddress = path.join(fileUploadPath, audioFile.filename).replace(/\\/g, "/");
            const audioURL = `${this.baseUrl}:${this.applicationPort}/${audioAddress}`;
            try {
                const seconds = await audioSeconds(audioURL);
                mediaEntries.push({
                    url: audioAddress,
                    filename: audioFile.filename,
                    type: 'AUDIO',
                    fileSize: audioFile.size.toString(),
                    mimeType: audioFile.mimetype,
                    duration: getTime(seconds),
                    status: 'COMPLETED',
                    productId
                });
            } catch (error) {
                console.error("Error processing audio file:", error);
            }
        }
        return mediaEntries;
    }

    async #processVideoFiles(videoFiles, fileUploadPath, productId) {
        const mediaEntries = [];
        if (Array.isArray(videoFiles) && videoFiles.length > 0) {
            const videoFile = videoFiles[0];
            const videoAddress = path.join(fileUploadPath, videoFile.filename).replace(/\\/g, "/");
            const videoURL = `${this.baseUrl}:${this.applicationPort}/${videoAddress}`;
            try {
                const seconds = await getVideoDurationInSeconds(videoURL);
                const duration = getTime(seconds);
                mediaEntries.push({
                    url: videoAddress,
                    filename: videoFile.filename,
                    type: 'VIDEO',
                    fileSize: videoFile.size.toString(),
                    mimeType: videoFile.mimetype,
                    duration,
                    status: 'COMPLETED',
                    productId
                });
            } catch (error) {
                console.error("Error calculating video duration:", error);
            }
        }
        return mediaEntries;
    }
}

module.exports = { AttachmentProcessor,
                   MediaProcessor}
/*
 نحوه استفاده:
 const MediaProcessor = require('./MediaProcessor');

const processor = new MediaProcessor();
const files = req.files; // فایل‌ها از ریکوئست
const fileUploadPath = "path/to/uploads";
const productId = "some-product-id";
(async () => {
    const mediaEntries = await processor.processContentMedia(files, fileUploadPath, productId);
    console.log(mediaEntries);
})();

const AttachmentProcessor = require('./AttachmentProcessor');

const processor = new AttachmentProcessor();
const files = req.files; // یا هر منبع دیگر برای فایل‌ها
const fileUploadPath = "path/to/uploads";
const correlationType = "some-correlation-type";

(async () => {
    const attachments = await processor.processAttachments(files, fileUploadPath, correlationType);
    console.log(attachments);
})();
*/