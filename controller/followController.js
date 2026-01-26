const Follow = require('../models/Follow');
const Customer = require('../models/Customer');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');

/**
 * Toggle follow/unfollow a user
 * POST /api/users/:id/follow
 */
const toggleFollow = async (req, res) => {
  try {
    const { id } = req.params; // User to follow/unfollow
    const followerId = req.user?._id; // Current user

    if (!followerId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    // Check CBSG master switch
    const cbsgStatus = await getCBSGStatus();
    if (!cbsgStatus.enabled || cbsgStatus.mode === 'hidden') {
      return res.status(503).send({
        message: 'CBSG is currently under maintenance',
      });
    }

    // Cannot follow yourself (handled by model, but check here too)
    if (followerId.toString() === id) {
      return res.status(400).send({
        message: 'Cannot follow yourself',
      });
    }

    // Verify user to follow exists and is approved
    const userToFollow = await Customer.findById(id);
    if (!userToFollow) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    if (!userToFollow.approved) {
      return res.status(403).send({
        message: 'Cannot follow unapproved users',
      });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower_id: followerId,
      following_id: id,
    });

    let following = false;
    let action = '';

    if (existingFollow) {
      // Unfollow: remove the follow
      await Follow.findByIdAndDelete(existingFollow._id);
      action = 'unfollowed';
      following = false;
    } else {
      // Follow: create new follow
      const newFollow = new Follow({
        follower_id: followerId,
        following_id: id,
      });
      await newFollow.save();
      action = 'followed';
      following = true;
    }

    // Get updated counts
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following_id: id }),
      Follow.countDocuments({ follower_id: id }),
    ]);

    // Send notification to user being followed
    if (following) {
      const {
        notifyUserFollowed,
      } = require('../utils/cbsgNotificationService');
      await notifyUserFollowed(id, followerId);
    }

    res.send({
      message: `User ${action} successfully`,
      following,
      followersCount,
      followingCount,
    });
  } catch (err) {
    // Handle self-follow error from model
    if (err.message === 'Cannot follow yourself') {
      return res.status(400).send({
        message: err.message,
      });
    }
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get followers of a user
 * GET /api/users/:id/followers
 */
const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify user exists
    const user = await Customer.findById(id);
    if (!user) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    // Get followers
    const [follows, total] = await Promise.all([
      Follow.find({ following_id: id })
        .populate('follower_id', 'name email handle avatar_url approved')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Follow.countDocuments({ following_id: id }),
    ]);

    // Filter out unapproved users
    const followers = follows
      .filter((follow) => follow.follower_id && follow.follower_id.approved)
      .map((follow) => ({
        _id: follow._id,
        user: {
          _id: follow.follower_id._id,
          name: follow.follower_id.name,
          handle: follow.follower_id.handle,
          avatar_url: follow.follower_id.avatar_url,
        },
        followedAt: follow.createdAt,
      }));

    // Check if current user is following (if authenticated)
    let isFollowing = false;
    if (req.user?._id) {
      const follow = await Follow.findOne({
        follower_id: req.user._id,
        following_id: id,
      });
      isFollowing = !!follow;
    }

    res.send({
      followers,
      total: followers.length,
      isFollowing,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get users that a user is following
 * GET /api/users/:id/following
 */
const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify user exists
    const user = await Customer.findById(id);
    if (!user) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    // Get following
    const [follows, total] = await Promise.all([
      Follow.find({ follower_id: id })
        .populate('following_id', 'name email handle avatar_url approved')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Follow.countDocuments({ follower_id: id }),
    ]);

    // Filter out unapproved users
    const following = follows
      .filter((follow) => follow.following_id && follow.following_id.approved)
      .map((follow) => ({
        _id: follow._id,
        user: {
          _id: follow.following_id._id,
          name: follow.following_id.name,
          handle: follow.following_id.handle,
          avatar_url: follow.following_id.avatar_url,
        },
        followedAt: follow.createdAt,
      }));

    res.send({
      following,
      total: following.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get follow statistics for a user
 * GET /api/users/:id/follow-stats
 */
const getFollowStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user exists
    const user = await Customer.findById(id);
    if (!user) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    // Get counts
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following_id: id }),
      Follow.countDocuments({ follower_id: id }),
    ]);

    // Check if current user is following (if authenticated)
    let isFollowing = false;
    if (req.user?._id && req.user._id.toString() !== id) {
      const follow = await Follow.findOne({
        follower_id: req.user._id,
        following_id: id,
      });
      isFollowing = !!follow;
    }

    res.send({
      followersCount,
      followingCount,
      isFollowing,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowStats,
};

