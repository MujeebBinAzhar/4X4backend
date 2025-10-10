const express = require('express');
const router = express.Router();
const brandController = require('../controller/brandController');

router.post('/add', brandController.createBrand);
router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrandById);
router.put('/:id', brandController.updateBrand);
router.delete('/:id', brandController.deleteBrand);

module.exports = router;