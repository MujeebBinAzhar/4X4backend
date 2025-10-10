const express = require('express');
const router = express.Router();
const {
        getReviewsByProduct,

} = require('../controller/reviewController');

//add a Review
router.get('/product/:id', getReviewsByProduct);

module.exports = router;
