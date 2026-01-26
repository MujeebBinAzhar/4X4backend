const express = require('express');
const router = express.Router();
const {
  updateBuildPost,
  deleteBuildPost,
} = require('../controller/buildPostController');
const { isAuth } = require('../config/auth');
const { checkCBSGEnabled } = require('../utils/cbsgMasterSwitch');

// Build post management routes
router.patch('/:id', isAuth, checkCBSGEnabled, updateBuildPost);
router.delete('/:id', isAuth, checkCBSGEnabled, deleteBuildPost);

module.exports = router;

