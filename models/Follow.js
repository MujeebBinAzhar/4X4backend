const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    follower_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    following_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate follows and self-follows
followSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });
followSchema.index({ follower_id: 1 }); // For getting who a user follows
followSchema.index({ following_id: 1 }); // For getting a user's followers

// Prevent self-following
followSchema.pre('save', function(next) {
  if (this.follower_id.toString() === this.following_id.toString()) {
    const error = new Error('Cannot follow yourself');
    return next(error);
  }
  next();
});

const Follow = mongoose.model('Follow', followSchema);

module.exports = Follow;

