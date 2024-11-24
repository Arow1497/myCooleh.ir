const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// تنظیمات پردازش تصویر
const IMAGE_SETTINGS = {
  // تنظیمات نسخه اصلی
  ORIGINAL: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
  },
  // تنظیمات نسخه متوسط
  MEDIUM: {
    width: 800,
    height: 800,
    quality: 80,
  },
  // تنظیمات thumbnail
  THUMBNAIL: {
    width: 300,
    height: 300,
    quality: 70,
  },
  // فرمت‌های مجاز برای تصاویر
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  // حداکثر حجم فایل (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  // تنظیمات خروجی WebP
  WEBP_OPTIONS: {
    quality: 85,
    effort: 4, // سطح فشرده‌سازی (0-6)
    lossless: false,
  }
};

// پردازش اصلی تصویر
const processImage = async (file) => {
  if (!file.mimetype.startsWith('image/')) {
    return null;
  }

  // اگر GIF باشد، پردازش نکن و فقط متادیتا برگردان
  if (file.mimetype === 'image/gif') {
    const metadata = await sharp(file.path).metadata();
    return {
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      format: 'gif',
      size: fs.statSync(file.path).size,
    };
  }

  const imagePath = file.path;
  const fileDir = path.dirname(imagePath);
  const fileName = path.basename(imagePath, path.extname(imagePath));

  try {
    // خواندن متادیتای تصویر اصلی
    const metadata = await sharp(imagePath).metadata();

    // ساخت مسیرهای خروجی
    const outputs = {
      original: imagePath,
      medium: path.join(fileDir, `${fileName}-medium.webp`),
      thumbnail: path.join(fileDir, `${fileName}-thumb.webp`),
      webp: path.join(fileDir, `${fileName}.webp`)
    };

    // پردازش موازی تمام نسخه‌ها
    const [originalImage, mediumImage, thumbnailImage, webpVersion] = await Promise.all([
      processOriginal(imagePath, metadata),
      processMediumVersion(imagePath),
      processThumbnail(imagePath),
      processWebPVersion(imagePath)
    ]);

    // ذخیره نسخه‌ها
    await Promise.all([
      originalImage.toFile(outputs.original),
      mediumImage.toFile(outputs.medium),
      thumbnailImage.toFile(outputs.thumbnail),
      webpVersion.toFile(outputs.webp)
    ]);

    // بررسی و حذف نسخه اصلی اگر حجم نسخه WebP کمتر است
    const originalSize = fs.statSync(outputs.original).size;
    const webpSize = fs.statSync(outputs.webp).size;
    
    if (webpSize < originalSize) {
      fs.unlinkSync(outputs.original);
      fs.renameSync(outputs.webp, outputs.original);
    } else {
      fs.unlinkSync(outputs.webp);
    }

    // محاسبه اندازه‌های نهایی
    const finalMetadata = await sharp(outputs.original).metadata();

    return {
      dimensions: {
        width: finalMetadata.width,
        height: finalMetadata.height
      },
      format: finalMetadata.format,
      size: fs.statSync(outputs.original).size,
      urls: {
        original: `/uploads/images/${path.basename(outputs.original)}`,
        medium: `/uploads/images/${path.basename(outputs.medium)}`,
        thumbnail: `/uploads/images/${path.basename(outputs.thumbnail)}`
      },
      metadata: {
        hasAlpha: finalMetadata.hasAlpha,
        colorSpace: finalMetadata.space,
        channels: finalMetadata.channels,
      }
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

// پردازش نسخه اصلی
const processOriginal = async (imagePath, metadata) => {
  let processor = sharp(imagePath)
    .withMetadata() // حفظ متادیتای EXIF
    .rotate() // چرخش خودکار براساس EXIF;

  // ریسایز اگر تصویر خیلی بزرگ است
  if (metadata.width > IMAGE_SETTINGS.ORIGINAL.maxWidth || 
      metadata.height > IMAGE_SETTINGS.ORIGINAL.maxHeight) {
    processor = processor.resize(
      IMAGE_SETTINGS.ORIGINAL.maxWidth,
      IMAGE_SETTINGS.ORIGINAL.maxHeight,
      {
        fit: 'inside',
        withoutEnlargement: true
      }
    );
  }

  // بهینه‌سازی براساس فرمت
  if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
    processor = processor.jpeg({
      quality: IMAGE_SETTINGS.ORIGINAL.quality,
      mozjpeg: true
    });
  } else if (metadata.format === 'png') {
    processor = processor.png({
      compressionLevel: 9,
      palette: true
    });
  }

  return processor;
};

// پردازش نسخه متوسط
const processMediumVersion = (imagePath) => {
  return sharp(imagePath)
    .resize(
      IMAGE_SETTINGS.MEDIUM.width,
      IMAGE_SETTINGS.MEDIUM.height,
      {
        fit: 'inside',
        withoutEnlargement: true
      }
    )
    .webp(IMAGE_SETTINGS.WEBP_OPTIONS);
};

// پردازش thumbnail
const processThumbnail = (imagePath) => {
  return sharp(imagePath)
    .resize(
      IMAGE_SETTINGS.THUMBNAIL.width,
      IMAGE_SETTINGS.THUMBNAIL.height,
      {
        fit: 'cover',
        position: 'centre'
      }
    )
    .webp({
      ...IMAGE_SETTINGS.WEBP_OPTIONS,
      quality: IMAGE_SETTINGS.THUMBNAIL.quality
    });
};

// پردازش نسخه WebP
const processWebPVersion = (imagePath) => {
  return sharp(imagePath)
    .webp(IMAGE_SETTINGS.WEBP_OPTIONS);
};

// میدلور آپلود تصویر با پردازش
const uploadImageWithProcessing = (fieldName) => {
  return async (req, res, next) => {
    const imageUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        // بررسی فرمت فایل
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
          return;
        }

        const extension = file.originalname.split('.').pop().toLowerCase();
        if (!IMAGE_SETTINGS.ALLOWED_FORMATS.includes(extension)) {
          cb(new Error('فرمت فایل پشتیبانی نمی‌شود'));
          return;
        }

        cb(null, true);
      },
      limits: {
        fileSize: IMAGE_SETTINGS.MAX_FILE_SIZE
      }
    }).single(fieldName);

    imageUpload(req, res, async (err) => {
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
          ...imageData
        };
        next();
      } catch (error) {
        cleanupImageFiles(req.file);
        next(error);
      }
    });
  };
};

// تابع پاکسازی فایل‌های تصویری
const cleanupImageFiles = (file) => {
  if (!file) return;

  const fileDir = path.dirname(file.path);
  const fileName = path.basename(file.path, path.extname(file.path));
  
  // پاکسازی تمام نسخه‌های تصویر
  const versions = [
    file.path,
    path.join(fileDir, `${fileName}-medium.webp`),
    path.join(fileDir, `${fileName}-thumb.webp`),
    path.join(fileDir, `${fileName}.webp`)
  ];

  versions.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

// میدلور برای پردازش آرایه‌ای از تصاویر
const uploadMultipleImagesWithProcessing = (fieldName, maxCount = 10) => {
  return async (req, res, next) => {
    const imageUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
          return;
        }

        const extension = file.originalname.split('.').pop().toLowerCase();
        if (!IMAGE_SETTINGS.ALLOWED_FORMATS.includes(extension)) {
          cb(new Error('فرمت فایل پشتیبانی نمی‌شود'));
          return;
        }

        cb(null, true);
      },
      limits: {
        fileSize: IMAGE_SETTINGS.MAX_FILE_SIZE,
        files: maxCount
      }
    }).array(fieldName, maxCount);

    imageUpload(req, res, async (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'فایلی آپلود نشده است' });
      }

      try {
        const processedImages = await Promise.all(
          req.files.map(async (file) => {
            const imageData = await processImage(file);
            return {
              ...file,
              ...imageData
            };
          })
        );

        req.processedFiles = processedImages;
        next();
      } catch (error) {
        req.files.forEach(file => cleanupImageFiles(file));
        next(error);
      }
    });
  };
};

module.exports = {
  ...module.exports,
  uploadImageWithProcessing,
  uploadMultipleImagesWithProcessing,
  processImage,
  cleanupImageFiles,
  IMAGE_SETTINGS
};

/*
این کد قابلیت‌های زیر را فراهم می‌کند:

پردازش چند نسخه از تصویر:

نسخه اصلی (بهینه‌شده)
نسخه متوسط (800px)
نسخه thumbnail (300px)
نسخه WebP (برای مرورگرهای مدرن)


بهینه‌سازی‌های پیشرفته:

تبدیل خودکار به WebP در صورت کاهش حجم
فشرده‌سازی هوشمند براساس فرمت
حفظ متادیتای EXIF
چرخش خودکار تصاویر


مدیریت خطا و امنیت:

بررسی فرمت‌های مجاز
محدودیت حجم فایل
پاکسازی خودکار در صورت خطا


پشتیبانی از آپلود چندگانه:

پردازش همزمان چند تصویر
محدودیت تعداد فایل‌ها



برای استفاده در routes:
javascriptCopy// آپلود تک تصویر
router.post('/upload-image', 
  uploadImageWithProcessing('image'), 
  (req, res) => {
    res.json({
      message: 'Image processed successfully',
      file: req.processedFile
    });
  }
);

// آپلود چند تصویر
router.post('/upload-multiple-images', 
  uploadMultipleImagesWithProcessing('images', 5), 
  (req, res) => {
    res.json({
      message: 'Images processed successfully',
      files: req.processedFiles
    });
  }
);
نکات مهم:

پردازش موازی برای افزایش سرعت
تولید خودکار نسخه WebP
بهینه‌سازی متفاوت برای هر فرمت
مدیریت حافظه بهینه
قابلیت شخصی‌سازی تنظیمات
*/