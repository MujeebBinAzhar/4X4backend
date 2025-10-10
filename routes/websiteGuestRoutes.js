const express = require('express');
const router = express.Router();

const {
 addGuestPost,
  getPublishedGuestPostsForWebsite,
  getGuestPostById,
  updateGuestPost,
  deleteGuestPost,
} = require('../controller/guestPostController');

// Admin Routes
router.get('/', getPublishedGuestPostsForWebsite);

router.post('/add', addGuestPost);
router.get('/:id', getGuestPostById);
router.put('/:id', updateGuestPost);
router.delete('/:id', deleteGuestPost);



module.exports = router
