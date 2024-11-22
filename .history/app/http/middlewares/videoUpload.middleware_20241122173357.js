const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// تنظیم مسیر ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// تنظیمات ذخیره‌سازی ویدیو
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos/temp'); // پوشه موقت برای آپلود اولیه
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `original-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// فیلتر فایل‌های ویدیویی
const videoFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error('فرمت ویدیو پشتیبانی نمی‌شود. فقط فرمت‌های MP4, WebM, MOV, AVI و MKV مجاز هستند.'));
    return;
  }

  cb(null, true);
};

// تنظیمات محدودیت‌های ویدیو
const videoLimits = {
  fileSize: 500 * 1024 * 1024, // 500 مگابایت
  files: 1 // فقط یک ویدیو در هر درخواست
};

// ایجاد instance از multer برای ویدیو
const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: videoLimits
});

// کلاس مدیریت پردازش ویدیو
class VideoProcessor {
  constructor(file) {
    this.file = file;
    this.processedDir = path.join(__dirname, '../uploads/videos/processed');
    this.thumbnailsDir = path.join(__dirname, '../uploads/videos/thumbnails');
    
    // اطمینان از وجود دایرکتوری‌ها
    [this.processedDir, this.thumbnailsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // دریافت مدت زمان ویدیو
  async getDuration() {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this.file.path, (err, metadata) => {
        if (err) reject(err);
        resolve(metadata.format.duration);
      });
    });
  }

  // ایجاد تصویر شاخص از ویدیو
  async generateThumbnail() {
    const thumbnailName = `thumb-${path.basename(this.file.filename, path.extname(this.file.filename))}.jpg`;
    const thumbnailPath = path.join(this.thumbnailsDir, thumbnailName);

    return new Promise((resolve, reject) => {
      ffmpeg(this.file.path)
        .screenshots({
          count: 1,
          folder: this.thumbnailsDir,
          filename: thumbnailName,
          size: '320x240'
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', (err) => reject(err));
    });
  }

  // پردازش و بهینه‌سازی ویدیو
  async processVideo() {
    const processedName = `processed-${path.basename(this.file.filename)}`;
    const processedPath = path.join(this.processedDir, processedName);

    return new Promise((resolve, reject) => {
      ffmpeg(this.file.path)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('1280x?') // حداکثر عرض 1280 با حفظ نسبت تصویر
        .videoBitrate('1000k')
        .audioBitrate('128k')
        .fps(30)
        .outputOptions([
          '-preset medium', // تعادل بین سرعت پردازش و کیفیت
          '-movflags +faststart', // آماده‌سازی برای پخش آنلاین
          '-profile:v main', // سازگاری بیشتر
          '-level 3.1'
        ])
        .output(processedPath)
        .on('end', () => resolve(processedPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  // پاکسازی فایل اصلی
  cleanup() {
    if (fs.existsSync(this.file.path)) {
      fs.unlinkSync(this.file.path);
    }
  }
}

// میدلور آپلود و پردازش ویدیو
const uploadAndProcessVideo = async (fieldName) => {
  return async (req, res, next) => {
    videoUpload.single(fieldName)(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'حجم ویدیو بیشتر از حد مجاز است (حداکثر 500 مگابایت)'
          });
        }
        return res.status(400).json({ error: err.message });
      }
      
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'لطفاً یک ویدیو انتخاب کنید' });
      }

      try {
        const processor = new VideoProcessor(req.file);
        
        // پردازش موازی برای سرعت بیشتر
        const [duration, processedPath, thumbnailPath] = await Promise.all([
          processor.getDuration(),
          processor.processVideo(),
          processor.generateThumbnail()
        ]);

        // پاکسازی فایل اصلی
        processor.cleanup();

        // افزودن اطلاعات پردازش شده به درخواست
        req.processedVideo = {
          originalName: req.file.originalname,
          filename: path.basename(processedPath),
          path: processedPath,
          thumbnailPath: thumbnailPath,
          duration: duration,
          size: fs.statSync(processedPath).size,
          mimeType: 'video/mp4'
        };

        next();
      } catch (error) {
        console.error('Video processing error:', error);
        // پاکسازی در صورت خطا
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ 
          error: 'خطا در پردازش ویدیو. لطفاً مجدداً تلاش کنید.' 
        });
      }
    });
  };
};

module.exports = {
  uploadAndProcessVideo
};


/*
و برای استفاده از این کانفیگ در routes:
javascriptCopyconst express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { uploadAndProcessVideo } = require('../config/video-upload');

const prisma = new PrismaClient();

مسیر آپلود ویدیو
router.post('/upload/video', uploadAndProcessVideo('video'), async (req, res) => {
  try {
    const videoData = req.processedVideo;
    
    ذخیره اطلاعات در دیتابیس
    const media = await prisma.contentMedia.create({
      data: {
        url: `/uploads/videos/processed/${videoData.filename}`,
        type: 'VIDEO',
        filename: videoData.filename,
        fileSize: videoData.size.toString(),
        mimeType: videoData.mimeType,
        thumbnailUrl: `/uploads/videos/thumbnails/${path.basename(videoData.thumbnailPath)}`,
        duration: videoData.duration.toString(),
        userId: req.user.id,
        سایر فیلدهای مورد نیاز
      }
    });
    
    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'خطا در ذخیره‌سازی اطلاعات ویدیو' 
    });
  }
});

module.exports = router;
این کانفیگ شامل ویژگی‌های زیر است:

مدیریت جداگانه ویدیو:

محدودیت‌های خاص برای فایل‌های ویدیویی
پوشه‌بندی مجزا برای ویدیوها
فیلتر فرمت‌های مجاز ویدیویی


پردازش پیشرفته ویدیو:

کاهش حجم با حفظ کیفیت مناسب
تنظیم رزولوشن و بیت‌ریت
تبدیل به فرمت MP4 سازگار با وب
ایجاد خودکار تصویر شاخص (thumbnail)


بهینه‌سازی:

پردازش موازی عملیات‌ها
ذخیره موقت و پاکسازی خودکار
مدیریت خطاها


ویژگی‌های اضافی:

استخراج مدت زمان ویدیو
ایجاد نسخه بهینه برای پخش آنلاین
سازگاری با دستگاه‌های مختلف
*/