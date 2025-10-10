const express = require('express');
const router = express.Router();
const {
  addBlog,
  getAllBlogsAdmin,
  getBlogById,
  updateBlog,
  deleteBlog,
} = require('../controller/blogController');

// Add a new blog post (Admin only)
router.post('/add', addBlog);

// Get all blogs for Admin (including drafts)
router.get('/', getAllBlogsAdmin); // Protect this route

// Get blog by ID or slug (Admin can access all)
router.get('/:id', getBlogById);

// Update blog post (Admin only)
router.put('/:id', updateBlog);

// Delete blog post (Admin only)
router.delete('/:id', deleteBlog);

module.exports = router;