const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true, // Ensures no duplicate emails
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
        },
        password: {
            type: String,
            required: true,
        },

        reviews: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Review", // Reference to the Review model
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt fields
    }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
