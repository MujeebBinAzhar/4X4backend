// models/Brand.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const brandSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        unique: true, // Brand name must be unique
    },
    logo_url: {
        type: String,
        required: false,
    },
    // Keep image for backward compatibility (map to logo_url)
    image: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    website_url: {
        type: String,
        required: false,
        validate: {
            validator: function(v) {
                // Allow empty string or valid URL
                if (!v) return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Website URL must be a valid URL starting with http:// or https://'
        }
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    // Keep isPublished for backward compatibility (map to is_active)
    isPublished: {
        type: String,
        lowercase: true,
        enum: ['show', 'hide'],
        default: 'show',
    },
    country: {
        type: String,
        required: false, // Made optional as per new requirements
    },
}, { timestamps: true });

// Auto-generate slug from name if not provided
brandSchema.pre('validate', function(next) {
    if (!this.slug && this.name) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    
    // Sync isPublished with is_active for backward compatibility
    // Priority: is_active (new field) > isPublished (old field)
    if (this.isModified('is_active') || this.isNew) {
        // If is_active is set, sync to isPublished
        this.isPublished = this.is_active ? 'show' : 'hide';
    } else if (this.isModified('isPublished') && this.is_active === undefined) {
        // If only isPublished is modified and is_active not set, sync from isPublished
        this.is_active = this.isPublished === 'show';
    }
    
    // Map image to logo_url if logo_url is not set
    if (this.image && !this.logo_url) {
        this.logo_url = this.image;
    }
    next();
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;

