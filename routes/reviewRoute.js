const express = require('express');
const router = express.Router();
const {
        addReview,
        addAllReview,
        getAllReviews,
        getShowingReviews,
        getReviewById,
        updateReview,
        updateStatus,
        deleteReview,
        updateManyReviews,
        deleteManyReviews,
} = require('../controller/reviewController');

//add a Review
router.post('/add', addReview);

//add multiple Review
router.post('/add/all', addAllReview);

//get all Review
router.get('/', getAllReviews);

//get only enable Review
router.get('/show', getShowingReviews);

//get a Review
router.get('/:id', getReviewById);

//update a Review
router.put('/:id', updateReview);

//update many Review
router.patch('/update/many', updateManyReviews);

//show/hide a Review
router.put('/status/:id', updateStatus);

//delete a Review
router.delete('/:id', deleteReview);

//delete many Review
router.patch('/delete/many', deleteManyReviews);

module.exports = router;
