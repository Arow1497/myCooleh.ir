const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

// تنظیم مسیر ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// تنظیمات پردازش ویدیو
const VIDEO_QUALITIES = {
  HIGH: {
    resolution: '1280x720',
    videoBitrate: '2500k',
    audioBitrate: '192k',
    label: '720p'
  },
  MEDIUM: {
    resolution: '854x480',
    videoBitrate: '1500k',
    audioBitrate: '128k',
    label: '480p'
  },
  LOW: {
    resolution: '640x360',
    videoBitrate: '800k',
    audioBitrate: '96k',
    label: '360p'
  }
};

// پردازش اصلی ویدیو
const processVideo = async (file) => {
  if (!file.mimetype.startsWith('video/')) {
    return null;
  }

  const videoPath = file.path;
  const fileDir = path.dirname(videoPath);
  const fileName = path.basename(videoPath, path.extname(videoPath));

  try {
    // دریافت متادیتای ویدیو
    const metadata = await getVideoMetadata(videoPath);
    
    // تولید thumbnail
    const thumbnailPath = await generateThumbnail(videoPath, fileDir, fileName);
    
    // پردازش ویدیو در کیفیت‌های مختلف
    const versions = await processVideoQualities(videoPath, fileDir, fileName);

    // جایگزینی فایل اصلی با نسخه 720p
    fs.unlinkSync(videoPath);
    fs.renameSync(versions.HIGH.path, videoPath);

    return {
      duration: metadata.duration,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      thumbnailUrl: `/uploads/video/thumb-${fileName}.jpg`,
      versions: {
        high: `/uploads/video/${fileName}-720p.mp4`,
        medium: `/uploads/video/${fileName}-480p.mp4`,
        low: `/uploads/video/${fileName}-360p.mp4`
      },
      size: fs.statSync(videoPath).size,
      format: 'mp4'
    };
  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
};

// دریافت متادیتای ویدیو
const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      
      resolve({
        duration: metadata.format.duration,
        width: videoStream?.width,
        height: videoStream?.height,
        bitrate: metadata.format.bit_rate,
        format: metadata.format.format_name
      });
    });
  });
};

// تولید thumbnail از ویدیو
const generateThumbnail = async (videoPath, fileDir, fileName) => {
  const thumbnailPath = path.join(fileDir, `thumb-${fileName}.jpg`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      // گرفتن فریم از 1 ثانیه اول ویدیو
      .screenshots({
        timestamps: ['1'],
        filename: `thumb-${fileName}.jpg`,
        folder: fileDir,
        size: '480x270'
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', reject);
  });
};

// پردازش ویدیو در کیفیت‌های مختلف
const processVideoQualities = async (videoPath, fileDir, fileName) => {
  const versions = {};

  for (const [quality, settings] of Object.entries(VIDEO_QUALITIES)) {
    const outputPath = path.join(fileDir, `${fileName}-${settings.label}.mp4`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .size(settings.resolution)
        .videoBitrate(settings.videoBitrate)
        .audioBitrate(settings.audioBitrate)
        // تنظیمات کدک
        .videoCodec('libx264')
        .audioCodec('aac')
        // تنظیمات بهینه‌سازی
        .outputOptions([
          '-preset medium',      // توازن بین سرعت پردازش و کیفیت
          '-crf 23',            // کیفیت ثابت (مقدار بین 18-28)
          '-movflags +faststart',// شروع پخش سریع‌تر
          '-profile:v main',     // پروفایل سازگار
          '-level 3.1',         // سطح سازگاری
          '-maxrate 5M',        // حداکثر بیت‌ریت
          '-bufsize 10M',       // سایز بافر
          '-pix_fmt yuv420p',   // فرمت پیکسل سازگار
          '-vf mpdecimate',     // حذف فریم‌های تکراری
          '-af dynaudnorm'      // نرمال‌سازی صدا
        ])
        .toFormat('mp4')
        .on('end', () => {
          versions[quality] = {
            path: outputPath,
            quality: settings.label
          };
          resolve();
        })
        .on('error', reject)
        .save(outputPath);
    });
  }

  return versions;
};

// میدلور آپلود ویدیو با پردازش
const uploadVideoWithProcessing = (fieldName) => {
  return async (req, res, next) => {
    // تنظیم محدودیت حجم فایل برای ویدیو
    const videoUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
          cb(new Error('فقط فایل‌های ویدیویی مجاز هستند'));
          return;
        }
        cb(null, true);
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
        files: 1
      }
    }).single(fieldName);

    videoUpload(req, res, async (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'فایلی آپلود نشده است' });
      }

      try {
        // نمایش پیام شروع پردازش
        res.status(202).json({ 
          message: 'ویدیو در حال پردازش است',
          fileId: req.file.filename 
        });

        const videoData = await processVideo(req.file);
        
        // ذخیره اطلاعات پردازش شده برای استفاده بعدی
        // می‌توانید این اطلاعات را در دیتابیس ذخیره کنید
        req.processedFile = {
          ...req.file,
          ...videoData
        };

        next();
      } catch (error) {
        cleanupOnError(req.file);
        next(error);
      }
    });
  };
};

// اضافه کردن VIDEO به ContentMediaType
const ContentMediaType = {
  ...ContentMediaType,
  VIDEO: 'VIDEO'
};

// بروزرسانی getFileType
const getFileType = (mimetype) => {
  if (mimetype.startsWith('video/')) return ContentMediaType.VIDEO;
  if (mimetype.startsWith('image/')) {
    return mimetype === 'image/gif' ? ContentMediaType.GIF : ContentMediaType.IMAGE;
  }
  if (mimetype.startsWith('audio/')) {
    const voiceMimeTypes = ['audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'];
    return voiceMimeTypes.includes(mimetype) ? ContentMediaType.VOICE : ContentMediaType.AUDIO;
  }
  if (mimetype.startsWith('application/')) return ContentMediaType.DOCUMENT;
  return null;
};

// تابع پاکسازی فایل‌های ویدیویی
const cleanupVideoFiles = (file) => {
  const fileDir = path.dirname(file.path);
  const fileName = path.basename(file.path, path.extname(file.path));
  
  // پاکسازی تمام نسخه‌های ویدیو
  Object.values(VIDEO_QUALITIES).forEach(quality => {
    const versionPath = path.join(fileDir, `${fileName}-${quality.label}.mp4`);
    if (fs.existsSync(versionPath)) {
      fs.unlinkSync(versionPath);
    }
  });

  // پاکسازی thumbnail
  const thumbnailPath = path.join(fileDir, `thumb-${fileName}.jpg`);
  if (fs.existsSync(thumbnailPath)) {
    fs.unlinkSync(thumbnailPath);
  }

  // پاکسازی فایل اصلی
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

module.exports = {
  ...module.exports,
  uploadVideoWithProcessing,
  processVideo,
  cleanupVideoFiles
};

/*
این کد امکانات زیر را فراهم می‌کند:

پردازش ویدیو در سه کیفیت مختلف:

720p (HD)
480p (SD)
360p (Low)


بهینه‌سازی‌های مهم:

استفاده از کدک H.264 برای سازگاری بیشتر
تنظیمات پیشرفته برای کاهش حجم و حفظ کیفیت
نرمال‌سازی صدا
حذف فریم‌های تکراری


تولید thumbnail خودکار از ویدیو
مدیریت خطا و پاکسازی فایل‌ها

برای استفاده در route ها:
javascriptCopyrouter.post('/upload-video', uploadVideoWithProcessing('video'), (req, res) => {
  res.json({
    message: 'Video processed successfully',
    file: req.processedFile
  });
});
نکات مهم:

این کد از الگوی async/await استفاده می‌کند
پردازش ویدیو زمان‌بر است، پس status 202 برمی‌گرداند
محدودیت حجم فایل 500MB تنظیم شده است
برای مدیریت فایل‌های بزرگ‌تر، بهتر است از سیستم صف مثل Bull استفاده کنید
برای ذخیره اطلاعات پردازش، باید به دیتابیس متصل شود
*/