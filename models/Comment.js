const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
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
    body: {
      type: String,
      required: true,
      trim: true,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    parent_comment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      required: false, // For nested replies
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
commentSchema.index({ build_id: 1, createdAt: -1 });
commentSchema.index({ user_id: 1 });
commentSchema.index({ flagged: 1 });
commentSchema.index({ parent_comment_id: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;

