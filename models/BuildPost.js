const mongoose = require('mongoose');

const buildPostSchema = new mongoose.Schema(
  {
    build_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Build',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
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
buildPostSchema.index({ build_id: 1, createdAt: -1 }); // For chronological ordering
buildPostSchema.index({ createdAt: -1 });

const BuildPost = mongoose.model('BuildPost', buildPostSchema);

module.exports = BuildPost;

