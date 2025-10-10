const express = require('express');
const router = express.Router();
const {
        getAustraliaPostageOptions,

} = require('../controller/shippingRateController');

//add a Review
router.post('/', getAustraliaPostageOptions);

module.exports = router;
