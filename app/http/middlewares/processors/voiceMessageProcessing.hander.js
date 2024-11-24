const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// تنظیمات پردازش voice
const VOICE_SETTINGS = {
  // تنظیمات بهینه برای voice message
  bitrate: '32k',          // بیت‌ریت مناسب برای صدای انسان
  channels: 1,             // مونو
  frequency: 24000,        // فرکانس نمونه‌برداری
  compression: 5,          // سطح فشرده‌سازی MP3 (مقدار بین 0 تا 9)
};

// پردازش voice message
const processVoice = async (file) => {
  if (!file.mimetype.startsWith('audio/')) {
    return null;
  }

  const voicePath = file.path;
  const fileDir = path.dirname(voicePath);
  const fileName = path.basename(voicePath, path.extname(voicePath));
  const processedPath = path.join(fileDir, `processed-${fileName}.mp3`);

  try {
    // دریافت متادیتای فایل صوتی
    const metadata = await getVoiceMetadata(voicePath);
    
    // پردازش و بهینه‌سازی voice
    await processVoiceFile(voicePath, processedPath);

    // جایگزینی فایل اصلی با نسخه پردازش شده
    fs.unlinkSync(voicePath);
    fs.renameSync(processedPath, voicePath);

    return {
      duration: metadata.duration,
      format: 'mp3',
      size: fs.statSync(voicePath).size,
      url: `/uploads/voice/${path.basename(voicePath)}`
    };
  } catch (error) {
    console.error('Error processing voice:', error);
    // پاکسازی فایل در صورت خطا
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
    throw error;
  }
};

// دریافت متادیتای voice
const getVoiceMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      
      resolve({
        duration: metadata.format.duration,
        format: metadata.format.format_name,
        channels: audioStream?.channels,
        sampleRate: audioStream?.sample_rate
      });
    });
  });
};

// پردازش و بهینه‌سازی فایل voice
const processVoiceFile = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // تبدیل به مونو
      .toFormat('mp3')
      .audioChannels(VOICE_SETTINGS.channels)
      // تنظیم فرکانس نمونه‌برداری
      .audioFrequency(VOICE_SETTINGS.frequency)
      // تنظیم بیت‌ریت
      .audioBitrate(VOICE_SETTINGS.bitrate)
      // کاهش نویز
      .audioFilters([
        'afftdn=nf=-25',      // کاهش نویز پس‌زمینه
        'highpass=f=200',      // حذف فرکانس‌های پایین ناخواسته
        'lowpass=f=3000',      // حذف فرکانس‌های بالای ناخواسته
        'compand=0.3|0.8',     // نرمال‌سازی صدا
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

// ساخت میدلور برای آپلود voice با پردازش
const uploadVoiceWithProcessing = (fieldName) => {
  return async (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'فایلی آپلود نشده است' });
      }

      try {
        const voiceData = await processVoice(req.file);
        req.processedFile = {
          ...req.file,
          ...voiceData
        };
        next();
      } catch (error) {
        cleanupOnError(req.file);
        next(error);
      }
    });
  };
};

// اضافه کردن voice به ContentMediaType
const ContentMediaType = {
  ...ContentMediaType,
  VOICE: 'VOICE'
};

// بروزرسانی تابع getFileType
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return mimetype === 'image/gif' ? ContentMediaType.GIF : ContentMediaType.IMAGE;
  }
  if (mimetype.startsWith('audio/')) {
    // تشخیص voice بر اساس MIME type
    const voiceMimeTypes = ['audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'];
    return voiceMimeTypes.includes(mimetype) ? ContentMediaType.VOICE : ContentMediaType.AUDIO;
  }
  if (mimetype.startsWith('application/')) return ContentMediaType.DOCUMENT;
  return null;
};

module.exports = {
  ...module.exports,
  uploadVoiceWithProcessing,
  processVoice,
  ContentMediaType
};

/*
این کد برای پردازش voice message ها بهینه شده و شامل موارد زیر است:

تنظیمات مخصوص voice:


بیت‌ریت 32k که برای صدای انسان مناسب است
تک کاناله (مونو)
فرکانس 24kHz که برای صدای انسان کافی است


بهبود کیفیت صدا:


کاهش نویز پس‌زمینه با afftdn
فیلتر فرکانس‌های پایین و بالای ناخواسته
نرمال‌سازی صدا با compand


تشخیص voice از audio معمولی:


اضافه کردن VOICE به ContentMediaType
تشخیص خودکار voice بر اساس MIME type


میدلور مخصوص آپلود voice:


uploadVoiceWithProcessing برای هندل کردن آپلود و پردازش voice

برای استفاده می‌توانید از میدلور در route ها استفاده کنید:
javascriptCopyrouter.post('/upload-voice', uploadVoiceWithProcessing('voice'), (req, res) => {
  res.json({
    message: 'Voice uploaded successfully',
    file: req.processedFile
  });
});
*/