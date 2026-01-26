const express = require('express');
const router = express.Router();
const {
  getAllBuilds,
  getBuildById,
  createBuild,
  updateBuild,
  deleteBuild,
  approveBuild,
  getBuildsByUser,
} = require('../controller/buildController');
const {
  getBuildProducts,
  linkProducts,
  unlinkProduct,
  searchProducts,
  getSuggestedProducts,
} = require('../controller/buildProductController');
const {
  toggleLike,
  getBuildLikes,
} = require('../controller/likeController');
const {
  getBuildComments,
  addComment,
  updateComment,
  deleteComment,
  flagComment,
} = require('../controller/commentController');
const {
  exploreBuilds,
  getFollowingFeed,
  searchBuilds,
  getAvailableFilters,
} = require('../controller/discoveryController');
const {
  getBuildPosts,
  addBuildPost,
  updateBuildPost,
  deleteBuildPost,
} = require('../controller/buildPostController');
const { isAuth, isAdmin } = require('../config/auth');
const { checkCBSGEnabled } = require('../utils/cbsgMasterSwitch');
const {
  cbsgGeneralLimiter,
  buildCreationLimiter,
  searchLimiter,
  likeLimiter,
  commentLimiter,
  postLimiter,
} = require('../utils/rateLimiter');

// Discovery & Feed routes (must be before /:id routes)
router.get('/explore', cbsgGeneralLimiter, checkCBSGEnabled, exploreBuilds);
router.get('/feed', isAuth, cbsgGeneralLimiter, checkCBSGEnabled, getFollowingFeed);
router.get('/search', searchLimiter, checkCBSGEnabled, searchBuilds);
router.get('/filters', cbsgGeneralLimiter, checkCBSGEnabled, getAvailableFilters);

// Public routes (with CBSG check)
router.get('/', cbsgGeneralLimiter, checkCBSGEnabled, getAllBuilds);
router.get('/user/:userId', cbsgGeneralLimiter, checkCBSGEnabled, getBuildsByUser);
router.get('/:id', cbsgGeneralLimiter, checkCBSGEnabled, getBuildById);

// Authenticated routes
router.post('/', isAuth, buildCreationLimiter, checkCBSGEnabled, createBuild);
router.patch('/:id', isAuth, checkCBSGEnabled, updateBuild);
router.delete('/:id', isAuth, checkCBSGEnabled, deleteBuild);

// Admin routes
router.patch('/:id/approve', isAuth, isAdmin, approveBuild);

// Product linking routes
// Search products (public, but useful for linking)
router.get('/products/search', searchLimiter, checkCBSGEnabled, searchProducts);

// Get suggested products from order history (authenticated)
router.get('/suggested-products', isAuth, checkCBSGEnabled, getSuggestedProducts);

// Build product management (authenticated)
router.get('/:id/products', checkCBSGEnabled, getBuildProducts);
router.post('/:id/products', isAuth, checkCBSGEnabled, linkProducts);
router.delete('/:id/products/:productId', isAuth, checkCBSGEnabled, unlinkProduct);

// Like routes
router.post('/:id/like', isAuth, likeLimiter, checkCBSGEnabled, toggleLike);
router.get('/:id/likes', cbsgGeneralLimiter, checkCBSGEnabled, getBuildLikes);

// Comment routes
router.get('/:id/comments', cbsgGeneralLimiter, checkCBSGEnabled, getBuildComments);
router.post('/:id/comments', isAuth, commentLimiter, checkCBSGEnabled, addComment);

// Build post routes (timeline)
router.get('/:id/posts', cbsgGeneralLimiter, checkCBSGEnabled, getBuildPosts);
router.post('/:id/posts', isAuth, postLimiter, checkCBSGEnabled, addBuildPost);

module.exports = router;

