const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    specs: {
      // Vehicle specifications stored as JSON
      make: {
        type: String,
        required: false,
      },
      model: {
        type: String,
        required: false,
      },
      year: {
        type: Number,
        required: false,
      },
      series: {
        type: String,
        required: false,
      },
      engine: {
        type: String,
        required: false,
      },
      transmission: {
        type: String,
        required: false,
      },
      drivetrain: {
        type: String,
        required: false,
      },
      color: {
        type: String,
        required: false,
      },
      registration: {
        type: String,
        required: false,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    approved: {
      type: Boolean,
      default: false, // Requires admin approval before public visibility
    },
    hero_image_url: {
      type: String,
      required: false,
    },
    media_urls: [
      {
        type: String,
        required: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
buildSchema.index({ user_id: 1 });
buildSchema.index({ approved: 1, visibility: 1 });
buildSchema.index({ tags: 1 });
buildSchema.index({ 'specs.make': 1, 'specs.model': 1 });
buildSchema.index({ createdAt: -1 }); // For sorting by date

const Build = mongoose.model('Build', buildSchema);

module.exports = Build;

