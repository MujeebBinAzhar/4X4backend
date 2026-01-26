const express = require('express');
const router = express.Router();
const {
  getModerationQueue,
  disableUser,
  disableBuild,
  deleteCommentAdmin,
  deletePostAdmin,
  unflagComment,
  getModerationLogs,
  getModerationStats,
} = require('../controller/moderationController');
const { isAuth, isAdmin } = require('../config/auth');

// All moderation routes require admin authentication
router.use(isAuth, isAdmin);

// Moderation queue
router.get('/queue', getModerationQueue);

// User moderation
router.post('/users/:id/disable', disableUser);

// Build moderation
router.post('/builds/:id/disable', disableBuild);

// Comment moderation
router.delete('/comments/:id', deleteCommentAdmin);
router.post('/comments/:id/unflag', unflagComment);

// Post moderation
router.delete('/posts/:id', deletePostAdmin);

// Moderation logs
router.get('/logs', getModerationLogs);
router.get('/stats', getModerationStats);

module.exports = router;

