const express = require('express');
const router = express.Router();
const brandController = require('../controller/brandController');

router.get('/', brandController.getSiteBrands);

module.exports = router;