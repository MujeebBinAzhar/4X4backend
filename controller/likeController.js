const Like = require('../models/Like');
const Build = require('../models/Build');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');

/**
 * Toggle like/unlike a build
 * POST /api/builds/:id/like
 */
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
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

    // Verify build exists
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Check if user already liked this build
    const existingLike = await Like.findOne({
      build_id: id,
      user_id: userId,
    });

    let liked = false;
    let action = '';

    if (existingLike) {
      // Unlike: remove the like
      await Like.findByIdAndDelete(existingLike._id);
      action = 'unliked';
      liked = false;
    } else {
      // Like: create new like
      const newLike = new Like({
        build_id: id,
        user_id: userId,
      });
      await newLike.save();
      action = 'liked';
      liked = true;
    }

    // Get updated likes count
    const likesCount = await Like.countDocuments({ build_id: id });

    // Send notification to build owner if liked
    if (liked) {
      const {
        notifyBuildLiked,
      } = require('../utils/cbsgNotificationService');
      await notifyBuildLiked(id, build.user_id, userId, build.name);
    }

    res.send({
      message: `Build ${action} successfully`,
      liked,
      likesCount,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get likes for a build
 * GET /api/builds/:id/likes
 */
const getBuildLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify build exists
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Get likes with user information
    const [likes, total] = await Promise.all([
      Like.find({ build_id: id })
        .populate('user_id', 'name email handle avatar_url')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Like.countDocuments({ build_id: id }),
    ]);

    // Check if current user has liked (if authenticated)
    let userLiked = false;
    if (req.user?._id) {
      const userLike = await Like.findOne({
        build_id: id,
        user_id: req.user._id,
      });
      userLiked = !!userLike;
    }

    res.send({
      likes: likes.map((like) => ({
        _id: like._id,
        user: {
          _id: like.user_id._id,
          name: like.user_id.name,
          handle: like.user_id.handle,
          avatar_url: like.user_id.avatar_url,
        },
        createdAt: like.createdAt,
      })),
      total,
      likesCount: total,
      userLiked,
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

module.exports = {
  toggleLike,
  getBuildLikes,
};

