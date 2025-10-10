const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product", // Reference back to Product
            required: true,
        },
        name: {
            type: String,
            required: true, // Name of the reviewer
        },
        email: {
            type: String,
            required: true, // Email of the reviewer
            validate: {
                validator: function (v) {
                    // Simple regex for email validation
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: props => `${props.value} is not a valid email!`,
            },
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5, // Assuming a 5-star rating system
        },
        comment: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            default: "approved",
            enum: ["approved", "pending", "rejected"],
        },
    },
    {
        timestamps: true,
    }
);

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
