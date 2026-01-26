const express = require('express');
const router = express.Router();
const {
  updateComment,
  deleteComment,
  flagComment,
} = require('../controller/commentController');
const { isAuth } = require('../config/auth');
const { checkCBSGEnabled } = require('../utils/cbsgMasterSwitch');
const { commentLimiter } = require('../utils/rateLimiter');

// Comment management routes (update, delete, flag)
// Note: getBuildComments and addComment are in buildRoutes.js
router.patch('/:id', isAuth, commentLimiter, checkCBSGEnabled, updateComment);
router.delete('/:id', isAuth, checkCBSGEnabled, deleteComment);
router.post('/:id/flag', isAuth, checkCBSGEnabled, flagComment);

module.exports = router;

