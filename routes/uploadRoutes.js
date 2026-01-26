const router = require('express').Router();
const { isAuth, isAdmin } = require('../config/auth');
const {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
  getUploadedImages,
} = require('../controller/uploadController');

// All upload routes require admin authentication
router.post('/image', isAuth, isAdmin, uploadSingleImage);
router.post('/images', isAuth, isAdmin, uploadMultipleImages);
router.delete('/image', isAuth, isAdmin, deleteImage);
router.get('/images', isAuth, isAdmin, getUploadedImages);

module.exports = router;

