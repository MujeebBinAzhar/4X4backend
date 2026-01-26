const express = require('express');
const router = express.Router();
const {
  checkHandleAvailability,
  setUserHandle,
  approveUser,
  getPendingUsers,
  updatePrivacySettings,
  getUserProfile,
} = require('../controller/cbsgUserController');
const {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowStats,
} = require('../controller/followController');
const { isAuth, isAdmin } = require('../config/auth');
const { checkCBSGEnabled } = require('../utils/cbsgMasterSwitch');
const {
  cbsgGeneralLimiter,
  followLimiter,
} = require('../utils/rateLimiter');

// Handle availability check (public, but rate-limited in production)
router.post('/handle/check', cbsgGeneralLimiter, checkHandleAvailability);

// Set/update user handle (requires authentication)
router.patch('/:id/handle', isAuth, setUserHandle);

// User approval (admin only)
router.post('/approve', isAuth, isAdmin, approveUser);

// Get pending users (admin only)
router.get('/pending', isAuth, isAdmin, getPendingUsers);

// Update privacy settings (user can update own, admin can update any)
router.patch('/:id/privacy', isAuth, updatePrivacySettings);

// Get user profile with CBSG data
router.get('/:id/profile', getUserProfile);

// Follow routes
router.post('/:id/follow', isAuth, followLimiter, checkCBSGEnabled, toggleFollow);
router.get('/:id/followers', cbsgGeneralLimiter, checkCBSGEnabled, getFollowers);
router.get('/:id/following', cbsgGeneralLimiter, checkCBSGEnabled, getFollowing);
router.get('/:id/follow-stats', cbsgGeneralLimiter, checkCBSGEnabled, getFollowStats);

module.exports = router;

