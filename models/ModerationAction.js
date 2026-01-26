const mongoose = require('mongoose');

const moderationActionSchema = new mongoose.Schema(
  {
    action_type: {
      type: String,
      enum: [
        'approve_user',
        'reject_user',
        'approve_build',
        'reject_build',
        'disable_user',
        'disable_build',
        'delete_comment',
        'delete_post',
        'flag_content',
        'unflag_content',
        'edit_content',
        'suspend_user',
      ],
      required: true,
    },
    target_type: {
      type: String,
      enum: ['user', 'build', 'comment', 'post'],
      required: true,
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    moderator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    reason: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false, // Store additional context if needed
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
moderationActionSchema.index({ target_type: 1, target_id: 1 });
moderationActionSchema.index({ moderator_id: 1 });
moderationActionSchema.index({ action_type: 1 });
moderationActionSchema.index({ createdAt: -1 });

const ModerationAction = mongoose.model('ModerationAction', moderationActionSchema);

module.exports = ModerationAction;

