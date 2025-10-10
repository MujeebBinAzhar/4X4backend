const express = require('express');
const router = express.Router();
const blogController = require('../controller/blogController');

router.get('/', blogController.getAllBlogsWebsite);
router.get('/:slug', blogController.getBlogBySlug);

module.exports = router;