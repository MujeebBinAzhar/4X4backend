const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Get monthly folder path (YYYY/MM)
 * Example: 2024/01, 2024/02, etc.
 */
const getMonthlyFolder = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}/${month}`;
};

/**
 * Get full upload path for monthly folder
 */
const getUploadPath = () => {
  const monthlyFolder = getMonthlyFolder();
  const fullPath = path.join(__dirname, '..', 'uploads', monthlyFolder);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  
  return fullPath;
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  return `${sanitizedName}_${timestamp}_${random}${ext}`;
};

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = getUploadPath();
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  },
});

/**
 * File filter for images only
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed! (jpeg, jpg, png, gif, webp, svg)'));
  }
};

/**
 * Multer configuration
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: fileFilter,
});

/**
 * Get public URL for uploaded file
 * @param {string} filePath - Full file path
 * @param {object} req - Express request object (optional, for getting base URL)
 * @returns {string} Public URL
 */
const getPublicUrl = (filePath, req = null) => {
  if (!filePath) return null;
  
  // If already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Extract relative path from uploads folder
  const uploadsIndex = filePath.indexOf('uploads');
  if (uploadsIndex === -1) return filePath;
  
  const relativePath = filePath.substring(uploadsIndex);
  // Convert backslashes to forward slashes for URLs
  const relativeUrl = `/${relativePath.replace(/\\/g, '/')}`;
  
  // Build full URL if request object is provided
  if (req) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5055';
    return `${protocol}://${host}${relativeUrl}`;
  }
  
  // Fallback: use environment variable or default
  const baseURL = process.env.BASE_URL || process.env.API_BASE_URL || 'http://localhost:5055';
  return `${baseURL}${relativeUrl}`;
};

/**
 * Delete file from uploads folder
 * @param {string} filePath - Full file path or public URL
 */
const deleteFile = (filePath) => {
  try {
    if (!filePath) return false;
    
    // If it's a public URL, convert to file path
    let actualPath = filePath;
    if (filePath.startsWith('/uploads/')) {
      actualPath = path.join(__dirname, '..', filePath);
    } else if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // External URL, can't delete
      return false;
    }
    
    if (fs.existsSync(actualPath)) {
      fs.unlinkSync(actualPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  upload,
  getMonthlyFolder,
  getUploadPath,
  generateFileName,
  getPublicUrl,
  deleteFile,
};

