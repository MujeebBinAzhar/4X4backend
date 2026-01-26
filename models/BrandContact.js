// models/BrandContact.js
const mongoose = require('mongoose');

const brandContactSchema = new mongoose.Schema({
    brand_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
    },
    contact_name: {
        type: String,
        required: true,
    },
    position_title: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: false,
        validate: {
            validator: function(v) {
                // Allow empty string or E.164 format (optional)
                if (!v) return true;
                // E.164 format: +[country code][number] (e.g., +61412345678)
                return /^\+[1-9]\d{1,14}$/.test(v);
            },
            message: 'Phone number must be in E.164 format (e.g., +61412345678)'
        }
    },
    email: {
        type: String,
        required: false,
        validate: {
            validator: function(v) {
                // Allow empty string or valid email
                if (!v) return true;
                // RFC 5322 basic email validation
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Email must be a valid email address'
        }
    },
    notes: {
        type: String,
        required: false,
    },
}, { timestamps: true });

const BrandContact = mongoose.model('BrandContact', brandContactSchema);
module.exports = BrandContact;

