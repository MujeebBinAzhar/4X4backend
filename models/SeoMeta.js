// Import mongoose
const mongoose = require('mongoose');

// Define the SEO Meta Schema
const seoMetaSchema = new mongoose.Schema({
        page: {
                type: String,
                required: true,
                enum: [
                        'home',
                        'about',
                        'shop',
                        'blog',
                        'wishlist',
                        'cart',
                        'delivery-information',
                        'privacy-policy',
                        'contact-us',
                        'returns',
                        'checkout'
                ]
        },
        metaTitle: {
                type: String,
                required: true,
                trim: true
        },
        metaDescription: {
                type: String,
                required: true,
                trim: true
        },
        metaKeywords: {
                type: [String],
                required: true
        }
}, { timestamps: true });

// Create the model
const SeoMeta = mongoose.model('SeoMeta', seoMetaSchema);

// Export the model
module.exports = SeoMeta;
