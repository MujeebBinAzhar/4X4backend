const express = require('express');
const router = express.Router();
const {
  toggleLike,
  getBuildLikes,
} = require('../controller/likeController');
const { isAuth } = require('../config/auth');
const { checkCBSGEnabled } = require('../utils/cbsgMasterSwitch');

// Like routes
router.post('/:id/like', isAuth, checkCBSGEnabled, toggleLike);
router.get('/:id/likes', checkCBSGEnabled, getBuildLikes);

module.exports = router;

