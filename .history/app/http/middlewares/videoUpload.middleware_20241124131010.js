const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Import processors
const {
  processImage,
  processVideo,
  processVoice,
  IMAGE_SETTINGS,
  cleanupImageFiles,
  cleanupVideoFiles
} = require('./processors');

// Constants
const UPLOAD_PATH = 'uploads';
const MAX_FILE_SIZE = {
  IMAGE: 10 * 1024 * 1024,    // 10MB
  VIDEO: 500 * 1024 * 1024,   // 500MB
  VOICE: 50 * 1024 * 1024,    // 50MB
  DOCUMENT: 25 * 1024 * 1024  // 25MB
};

const MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  VOICE: ['audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
};

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fileType = getFileType(file.mimetype);
    const uploadDir = path.join(UPLOAD_PATH, fileType.toLowerCase());
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File type detection
const getFileType = (mimetype) => {
  if (MIME_TYPES.IMAGE.includes(mimetype)) {
    return mimetype === 'image/gif' ? 'GIF' : 'IMAGE';
  }
  if (MIME_TYPES.VIDEO.includes(mimetype)) return 'VIDEO';
  if (MIME_TYPES.VOICE.includes(mimetype)) return 'VOICE';
  if (MIME_TYPES.DOCUMENT.includes(mimetype)) return 'DOCUMENT';
  return null;
};

// File filter
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const fileType = getFileType(file.mimetype);
  
  if (!fileType || !allowedTypes.includes(fileType)) {
    return cb(new Error('File type not allowed'), false);
  }
  
  cb(null, true);
};

// Error handler
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size exceeds limit',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        code: 'TOO_MANY_FILES'
      });
    }
  }
  
  next(error);
};

// Convert file to attachment/contentMedia
const createMediaMetadata = (file, processedData) => {
  const baseMetadata = {
    url: `/${file.path}`,
    filename: file.originalname,
    fileType: getFileType(file.mimetype),
    fileSize: file.size.toString(),
    mimeType: file.mimetype,
    status: 'COMPLETED',
    metadata: {}
  };

  if (processedData) {
    if (processedData.dimensions) {
      baseMetadata.dimensions = processedData.dimensions;
    }
    if (processedData.duration) {
      baseMetadata.duration = processedData.duration.toString();
    }
    if (processedData.thumbnailUrl) {
      baseMetadata.thumbnailUrl = processedData.thumbnailUrl;
    }
  }

  return baseMetadata;
};

// Upload middlewares
const uploadSingleImage = multer({
  storage,
  fileFilter: fileFilter(['IMAGE', 'GIF']),
  limits: {
    fileSize: MAX_FILE_SIZE.IMAGE
  }
}).single('image');

const uploadMultipleImages = multer({
  storage,
  fileFilter: fileFilter(['IMAGE', 'GIF']),
  limits: {
    fileSize: MAX_FILE_SIZE.IMAGE,
    files: 10
  }
}).array('images', 10);

const uploadVoice = multer({
  storage,
  fileFilter: fileFilter(['VOICE']),
  limits: {
    fileSize: MAX_FILE_SIZE.VOICE
  }
}).single('voice');

const uploadVideo = multer({
  storage,
  fileFilter: fileFilter(['VIDEO']),
  limits: {
    fileSize: MAX_FILE_SIZE.VIDEO
  }
}).single('video');

// Processing middlewares
const processSingleImage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const processedData = await processImage(req.file);
    const mediaMetadata = createMediaMetadata(req.file, processedData);
    
    req.processedFile = {
      ...req.file,
      ...mediaMetadata
    };
    
    next();
  } catch (error) {
    cleanupImageFiles(req.file);
    next(error);
  }
};

const processMultipleImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const processedFiles = await Promise.all(
      req.files.map(async (file) => {
        const processedData = await processImage(file);
        const mediaMetadata = createMediaMetadata(file, processedData);
        return {
          ...file,
          ...mediaMetadata
        };
      })
    );

    req.processedFiles = processedFiles;
    next();
  } catch (error) {
    req.files.forEach(file => cleanupImageFiles(file));
    next(error);
  }
};

const processVoiceUpload = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const processedData = await processVoice(req.file);
    const mediaMetadata = createMediaMetadata(req.file, processedData);
    
    req.processedFile = {
      ...req.file,
      ...mediaMetadata
    };
    
    next();
  } catch (error) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

const processVideoUpload = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Send initial response for long-running video processing
    res.status(202).json({
      message: 'Video upload received, processing started',
      fileId: req.file.filename
    });

    const processedData = await processVideo(req.file);
    const mediaMetadata = createMediaMetadata(req.file, processedData);
    
    req.processedFile = {
      ...req.file,
      ...mediaMetadata
    };
    
    next();
  } catch (error) {
    cleanupVideoFiles(req.file);
    next(error);
  }
};

// Combined upload middlewares
const uploadMiddlewares = {
  singleImage: [uploadSingleImage, processSingleImage],
  multipleImages: [uploadMultipleImages, processMultipleImages],
  voice: [uploadVoice, processVoiceUpload],
  video: [uploadVideo, processVideoUpload]
};

module.exports = {
  uploadMiddlewares,
  handleUploadError,
  getFileType,
  createMediaMetadata,
  MIME_TYPES,
  MAX_FILE_SIZE
};