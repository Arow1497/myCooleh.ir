const multer = require("multer");
const path = require("path");
const fs = require("fs");
const createError = require("http-errors");

// تابعی برای ایجاد مسیر ذخیره‌سازی
function createStorageFolder(req, type) {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // اضافه کردن 1 و صفر پیش‌فرش
  const day = date.getDate().toString().padStart(2, '0'); // اضافه کردن صفر پیش‌فرش
  const directory = path.join(
    __dirname,
    "..",
    "..",
    "public",
    "uploads",
    type,
    year,
    month,
    day
  );
  req.body.fileUploadPath = path.join("uploads", type, year, month, day);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

// تابعی برای ایجاد storage
function createStorage(type) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (file?.originalname) {
        const filePath = createStorageFolder(req, type);
        return cb(null, filePath);
      }
      cb(new Error("مسیر ذخیره سازی نامعتبر"));
    },
    filename: (req, file, cb) => {
      if (file?.originalname) {
        const ext = path.extname(file.originalname);
        const fileName = String(new Date().getTime() + ext);
        req.body[`${file.fieldname}Filename`] = fileName;
        return cb(null, fileName);
      }
      cb(new Error("نام فایل نامعتبر"));
    },
  });
}

// فیلتر برای تصاویر
function imageFilter(req, file, cb) {
  const ext = path.extname(file.originalname);
  const mimetypes = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  if (mimetypes.includes(ext)) {
    return cb(null, true);
  }
  return cb(createError.BadRequest("فرمت ارسال شده تصویر صحیح نمیباشد"));
}

// فیلتر برای ویدیوها
function videoFilter(req, file, cb) {
  const ext = path.extname(file.originalname);
  const mimetypes = [".mp4", ".mpg", ".mov", ".avi", ".mkv"];
  if (mimetypes.includes(ext)) {
    return cb(null, true);
  }
  return cb(createError.BadRequest("فرمت ارسال شده ویدیو صحیح نمیباشد"));
}

// حداکثر اندازه فایل
const pictureMaxSize = 1 * 1024 * 1024; // 1MB
const videoMaxSize = 80 * 1024 * 1024; // 80MB

// پیکربندی multer برای آپلود تصاویر
const uploadImage = multer({
  storage: createStorage("images"),
  fileFilter: imageFilter,
  limits: { fileSize: pictureMaxSize }
});

// پیکربندی multer برای آپلود ویدیوها
const uploadVideo = multer({
  storage: createStorage("videos"),
  fileFilter: videoFilter,
  limits: { fileSize: videoMaxSize }
});

// پیکربندی multer برای آپلود پست‌ها
const upload = multer({
  storage: createStorage("posts"), // یا "post" برای پست ها
  limits: {
    fileSize: Math.max(pictureMaxSize, videoMaxSize),
  },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
}).fields([
  { name: "images", maxCount: 3 },
  { name: "video", maxCount: 1 },
]);

// تابع بررسی نوع فایل
function checkFileType(file, cb) {
  if (file.fieldname === "images") {
    const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (validMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("فرمت تصویر غیرمجاز است."));
  } else if (file.fieldname === "video") {
    const validMimeTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if (validMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("فرمت ویدئو غیرمجاز است."));
  } else {
    return cb(new Error("فیلد فایل نامعتبر است."));
  }
}

module.exports = {
  upload,
  uploadImage,
  uploadVideo,
};