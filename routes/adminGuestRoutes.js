const express = require('express');
const router = express.Router();

const {
 addGuestPost,
  getAllGuestPostsForAdmin,
  getGuestPostById,
  updateGuestPost,
  updateGuestPostStatus,
  deleteGuestPost,
  deleteManyGuestPosts,
} = require('../controller/guestPostController');

// Admin Routes
router.post('/add', addGuestPost);
router.get('/', getAllGuestPostsForAdmin);
router.get('/:id', getGuestPostById);
router.put('/:id', updateGuestPost);
router.put('/status/:id', updateGuestPostStatus);
router.delete('/:id', deleteGuestPost);
router.patch('/delete/many', deleteManyGuestPosts);



module.exports = router
