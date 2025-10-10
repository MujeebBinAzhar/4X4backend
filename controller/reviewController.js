const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

// const { mongo_connection } = require('../config/db'); // CCDev
const Review = require("../models/Review");
const Product = require("../models/Product");

const addReview = async (req, res) => {
        try {
                const newReview = new Review(req.body);
                await newReview.save();
                res.send({ message: "Review Added Successfully!" });
        } catch (err) {
                res.status(500).send({ message: err.message });
        }
};

const getReviewsByProduct = async (req, res) => {
        console.log('hello', req.params.id)
        try {
                const productReviews = await Review.find({
                        product: req.params.id,
                        status: 'approved'
                })
                res.send(productReviews);
        } catch (err) {
                res.status(500).send({ message: err.message });
        }
};

const addAllReview = async (req, res) => {
        try {
                await Review.deleteMany(); // Remove all reviews

                const payload = req.body;
                const processedPayload = [];

                for (const review of payload) {
                        const product = await Product.findOne({ sku: review.productSKU }); // Find product by SKU
                        if (product) {
                                processedPayload.push({
                                        ...review,
                                        product: product._id, // Add product ID
                                });
                        }
                }

                if (processedPayload.length) {
                        await Review.insertMany(processedPayload); // Insert valid reviews
                }

                res.status(200).send({
                        message: "Review(s) added successfully!",
                        totalReviewsAdded: processedPayload.length,
                });
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

const getAllReviews = async (req, res) => {
        // console.log('coupe')
        try {
                const queryObject = {};
                const { status } = req.query;

                if (status) {
                        queryObject.status = { $regex: `${status}`, $options: "i" };
                }
                const Reviews = await Review.find(queryObject).sort({ createdAt: -1 });
                // console.log('coups',Reviews)
                res.send(Reviews);
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

const getShowingReviews = async (req, res) => {
        // console.log("getShowingReviews");
        try {
                const Reviews = await Review.find({
                        status: "show",
                }).sort({ _id: -1 });
                res.send(Reviews);
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

const getReviewById = async (req, res) => {
        try {
                const Review = await Review.findById(req.params.id);
                res.send(Review);
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

const updateReview = async (req, res) => {
        try {
                const Review = await Review.findById(req.params.id);

                if (Review) {
                        Review.title = { ...Review.title, ...req.body.title };
                        // Review.title[req.body.lang] = req.body.title;
                        // Review.title = req.body.title;
                        Review.ReviewCode = req.body.ReviewCode;
                        Review.endTime = dayjs().utc().format(req.body.endTime);
                        // Review.discountPercentage = req.body.discountPercentage;
                        Review.minimumAmount = req.body.minimumAmount;
                        Review.productType = req.body.productType;
                        Review.discountType = req.body.discountType;
                        Review.logo = req.body.logo;

                        await Review.save();
                        res.send({ message: "Review Updated Successfully!" });
                }
        } catch (err) {
                res.status(404).send({ message: "Review not found!" });
        }
};

const updateManyReviews = async (req, res) => {
        try {
                await Review.updateMany(
                        { _id: { $in: req.body.ids } },
                        {
                                $set: {
                                        status: req.body.status,
                                        startTime: req.body.startTime,
                                        endTime: req.body.endTime,
                                },
                        },
                        {
                                multi: true,
                        }
                );

                res.send({
                        message: "Reviews update successfully!",
                });
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

const updateStatus = async (req, res) => {
        try {
                const newStatus = req.body.status;

                await Review.updateOne(
                        { _id: req.params.id },
                        {
                                $set: {
                                        status: newStatus === "show" ? "approved" : 'rejected',
                                },
                        }
                );
                res.status(200).send({
                        message: `Review ${newStatus === "show" ? "approved" : "Un-Published"
                                } Successfully!`,
                });
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

const deleteReview = async (req, res) => {
        try {
                await Review.deleteOne({ _id: req.params.id });
                res.status(200).send({
                        message: "Review Deleted Successfully!",
                });
        } catch (err) {
                res.status(500).send({ message: err.message });
        }
};

const deleteManyReviews = async (req, res) => {
        try {
                await Review.deleteMany({ _id: req.body.ids });
                res.send({
                        message: `Reviews Delete Successfully!`,
                });
        } catch (err) {
                res.status(500).send({
                        message: err.message,
                });
        }
};

module.exports = {
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
        getReviewsByProduct
};
