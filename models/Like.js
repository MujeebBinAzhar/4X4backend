const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    build_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Build',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate likes
likeSchema.index({ build_id: 1, user_id: 1 }, { unique: true });
likeSchema.index({ build_id: 1 });
likeSchema.index({ user_id: 1 });

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;

