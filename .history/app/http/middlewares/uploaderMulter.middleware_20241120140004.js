const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp');

// تنظیمات storage برای ذخیره‌سازی فایل‌ها
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ایجاد مسیر ذخیره‌سازی بر اساس نوع فایل
    const fileType = getFileType(file.mimetype);
    const uploadDir = path.join(__dirname, `../uploads/${fileType}`);
    
    // ایجاد دایرکتوری اگر وجود نداشت
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // ایجاد نام یکتا برای فایل
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${fileExtension}`);
  }
});

// تعریف انواع ContentMediaType
const ContentMediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT',
  GIF: 'GIF',
  EMBEDDED: 'EMBEDDED'
};

// تنظیمات فیلتر فایل‌ها
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    GIF: ['image/gif']
  };

  const fileType = getFileType(file.mimetype);
  
  if (!fileType || !allowedMimeTypes[fileType].includes(file.mimetype)) {
    cb(new Error('فرمت فایل پشتیبانی نمی‌شود'));
    return;
  }

  cb(null, true);
};

// تابع کمکی برای تشخیص نوع فایل
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return mimetype === 'image/gif' ? ContentMediaType.GIF : ContentMediaType.IMAGE;
  }
  if (mimetype.startsWith('video/')) return ContentMediaType.VIDEO;
  if (mimetype.startsWith('audio/')) return ContentMediaType.AUDIO;
  if (mimetype.startsWith('application/')) return ContentMediaType.DOCUMENT;
  return null;
};

// تنظیمات محدودیت‌های فایل
const limits = {
  fileSize: 50 * 1024 * 1024, // حداکثر 50 مگابایت
  files: 10 // حداکثر 10 فایل همزمان
};

// ایجاد instance از multer با تنظیمات
const upload = multer({
  storage,
  fileFilter,
  limits
});

// میدلور پردازش تصاویر
const processImage = async (file) => {
  if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/gif') {
    const imagePath = file.path;
    const processedPath = path.join(
      path.dirname(imagePath),
      `processed-${path.basename(imagePath)}`
    );

    try {
      // ایجاد نسخه بهینه‌شده از تصویر
      await sharp(imagePath)
        .resize(1920, 1080, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(processedPath);

      // جایگزینی فایل اصلی با نسخه پردازش شده
      fs.unlinkSync(imagePath);
      fs.renameSync(processedPath, imagePath);

      // ایجاد thumbnail
      const thumbnailPath = path.join(
        path.dirname(imagePath),
        `thumb-${path.basename(imagePath)}`
      );
      
      await sharp(imagePath)
        .resize(300, 300, { 
          fit: 'cover'
        })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);

      const metadata = await sharp(imagePath).metadata();
      
      return {
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        thumbnailUrl: `/uploads/images/thumb-${path.basename(imagePath)}`
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }
  return null;
};

// میدلور مدیریت خطا
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'حجم فایل بیشتر از حد مجاز است'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'تعداد فایل‌ها بیشتر از حد مجاز است'
      });
    }
  }
  
  if (error.message === 'فرمت فایل پشتیبانی نمی‌شود') {
    return res.status(400).json({
      error: error.message
    });
  }

  next(error);
};

// تابع کمکی برای پاکسازی فایل‌ها در صورت خطا
const cleanupOnError = (files) => {
  if (!Array.isArray(files)) {
    files = [files];
  }
  
  files.forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      
      // پاک کردن thumbnail اگر وجود داشته باشد
      const thumbPath = path.join(
        path.dirname(file.path),
        `thumb-${path.basename(file.path)}`
      );
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
  });
};

// ساخت میدلور برای آپلود تک فایل با پردازش تصویر
const uploadSingleWithProcessing = (fieldName) => {
  return async (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'فایلی آپلود نشده است' });
      }

      try {
        const imageData = await processImage(req.file);
        req.processedFile = {
          ...req.file,
          dimensions: imageData?.dimensions,
          thumbnailUrl: imageData?.thumbnailUrl
        };
        next();
      } catch (error) {
        cleanupOnError(req.file);
        next(error);
      }
    });
  };
};

// ساخت میدلور برای آپلود چند فایل با پردازش تصویر
const uploadMultipleWithProcessing = (fieldName, maxCount = 10) => {
  return async (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, async (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'فایلی آپلود نشده است' });
      }

      try {
        const processedFiles = await Promise.all(
          req.files.map(async (file) => {
            const imageData = await processImage(file);
            return {
              ...file,
              dimensions: imageData?.dimensions,
              thumbnailUrl: imageData?.thumbnailUrl
            };
          })
        );
        req.processedFiles = processedFiles;
        next();
      } catch (error) {
        cleanupOnError(req.files);
        next(error);
      }
    });
  };
};

module.exports = {
  upload,
  uploadSingleWithProcessing,
  uploadMultipleWithProcessing,
  handleUploadError,
  cleanupOnError,
  ContentMediaType,
  getFileType
};