const express = require('express');
const router = express.Router();
const seoController = require('../controller/seoController');

router.post('/add', seoController.createOrUpdateSeoMeta);
router.get('/:page', seoController.getSeoMetaByPage);
router.delete('/:page', seoController.deleteSeoMetaByPage);
router.get('/', seoController.getAllSeoMeta);

module.exports = router;