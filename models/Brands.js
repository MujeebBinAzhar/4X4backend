
// models/Brand.js
const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    isPublished: {
        type: String,
        lowercase: true,
        enum: ['show', 'hide'],
        default: 'show',

    },
}, { timestamps: true });

const Brands = mongoose.model('Brand', brandSchema);
module.exports = Brands;

