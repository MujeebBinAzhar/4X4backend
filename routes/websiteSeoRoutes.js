const express = require('express');
const router = express.Router();
const seoController = require('../controller/seoController');

router.get('/:page', seoController.getSeoMetaByPage);

module.exports = router;