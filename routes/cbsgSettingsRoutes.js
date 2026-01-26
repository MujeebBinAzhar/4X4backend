const express = require('express');
const router = express.Router();
const {
  getCBSGSettings,
  updateCBSGSettings,
} = require('../controller/cbsgSettingsController');
const { isAuth, isAdmin } = require('../config/auth');

// CBSG settings routes (admin only)
router.get('/', isAuth, isAdmin, getCBSGSettings);
router.patch('/', isAuth, isAdmin, updateCBSGSettings);

module.exports = router;

