const Build = require('../models/Build');
const Customer = require('../models/Customer');
const Comment = require('../models/Comment');
const BuildPost = require('../models/BuildPost');
const ModerationAction = require('../models/ModerationAction');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');
const { logModerationAction } = require('../utils/auditLogger');

/**
 * Get moderation queue (pending approvals and flagged content)
 * GET /api/moderation/queue
 */
const getModerationQueue = async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const queue = {
      pendingUsers: [],
      pendingBuilds: [],
      flaggedComments: [],
      flaggedPosts: [],
    };

    // Get pending users
    if (type === 'all' || type === 'users') {
      const [pendingUsers, usersTotal] = await Promise.all([
        Customer.find({ approved: false })
          .select('name email handle avatar_url provider createdAt')
          .sort({ createdAt: -1 })
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 10 : parseInt(limit)),
        Customer.countDocuments({ approved: false }),
      ]);

      queue.pendingUsers = pendingUsers;
      queue.usersTotal = usersTotal;
    }

    // Get pending builds
    if (type === 'all' || type === 'builds') {
      const [pendingBuilds, buildsTotal] = await Promise.all([
        Build.find({ approved: false })
          .populate('user_id', 'name email handle avatar_url')
          .sort({ createdAt: -1 })
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 10 : parseInt(limit)),
        Build.countDocuments({ approved: false }),
      ]);

      queue.pendingBuilds = pendingBuilds;
      queue.buildsTotal = buildsTotal;
    }

    // Get flagged comments
    if (type === 'all' || type === 'comments') {
      const [flaggedComments, commentsTotal] = await Promise.all([
        Comment.find({ flagged: true })
          .populate('user_id', 'name email handle avatar_url')
          .populate('build_id', 'name')
          .sort({ createdAt: -1 })
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 10 : parseInt(limit)),
        Comment.countDocuments({ flagged: true }),
      ]);

      queue.flaggedComments = flaggedComments;
      queue.commentsTotal = commentsTotal;
    }

    // Get flagged posts (if we add flagging to BuildPost model later)
    // For now, this is a placeholder

    res.send({
      queue,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Disable a user account
 * POST /api/moderation/users/:id/disable
 */
const disableUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user?._id;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    // Disable user by setting approved to false
    customer.approved = false;
    await customer.save();

    // Log moderation action with audit logger
    await logModerationAction(req, 'disable_user', 'user', id, reason || 'User account disabled by admin');

    // Send notification to user via NCS
    const {
      notifyUserDisabled,
    } = require('../utils/cbsgNotificationService');
    await notifyUserDisabled(id, reason);

    res.send({
      message: 'User disabled successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Disable a build
 * POST /api/moderation/builds/:id/disable
 */
const disableBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user?._id;

    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Disable build by setting approved to false and visibility to private
    build.approved = false;
    build.visibility = 'private';
    await build.save();

    // Log moderation action with audit logger
    await logModerationAction(req, 'disable_build', 'build', id, reason || 'Build disabled by admin');

    // Send notification to build owner via NCS
    const {
      notifyBuildDisabled,
    } = require('../utils/cbsgNotificationService');
    await notifyBuildDisabled(id, build.user_id, build.name, reason);

    res.send({
      message: 'Build disabled successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Delete a comment (admin)
 * DELETE /api/moderation/comments/:id
 */
const deleteCommentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user?._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).send({
        message: 'Comment not found',
      });
    }

    // Delete comment and all replies
    await Comment.deleteMany({
      $or: [
        { _id: id },
        { parent_comment_id: id },
      ],
    });

    // Log moderation action
    const moderationAction = new ModerationAction({
      action_type: 'delete_comment',
      target_type: 'comment',
      target_id: id,
      moderator_id: moderatorId,
      reason: reason || 'Comment deleted by admin',
    });
    await moderationAction.save();

    res.send({
      message: 'Comment deleted successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Delete a post (admin)
 * DELETE /api/moderation/posts/:id
 */
const deletePostAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user?._id;

    const post = await BuildPost.findById(id);
    if (!post) {
      return res.status(404).send({
        message: 'Post not found',
      });
    }

    await BuildPost.findByIdAndDelete(id);

    // Log moderation action
    const moderationAction = new ModerationAction({
      action_type: 'delete_post',
      target_type: 'post',
      target_id: id,
      moderator_id: moderatorId,
      reason: reason || 'Post deleted by admin',
    });
    await moderationAction.save();

    res.send({
      message: 'Post deleted successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Unflag content
 * POST /api/moderation/comments/:id/unflag
 */
const unflagComment = async (req, res) => {
  try {
    const { id } = req.params;
    const moderatorId = req.user?._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).send({
        message: 'Comment not found',
      });
    }

    comment.flagged = false;
    await comment.save();

    // Log moderation action
    const moderationAction = new ModerationAction({
      action_type: 'unflag_content',
      target_type: 'comment',
      target_id: id,
      moderator_id: moderatorId,
      reason: 'Content unflagged by admin',
    });
    await moderationAction.save();

    res.send({
      message: 'Comment unflagged successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get moderation action logs
 * GET /api/moderation/logs
 */
const getModerationLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action_type,
      target_type,
      moderator_id,
      start_date,
      end_date,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // Filter by action type
    if (action_type) {
      query.action_type = action_type;
    }

    // Filter by target type
    if (target_type) {
      query.target_type = target_type;
    }

    // Filter by moderator
    if (moderator_id) {
      query.moderator_id = moderator_id;
    }

    // Filter by date range
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) {
        query.createdAt.$gte = new Date(start_date);
      }
      if (end_date) {
        query.createdAt.$lte = new Date(end_date);
      }
    }

    const [logs, total] = await Promise.all([
      ModerationAction.find(query)
        .populate('moderator_id', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ModerationAction.countDocuments(query),
    ]);

    res.send({
      logs,
      total,
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
 * Get moderation statistics
 * GET /api/moderation/stats
 */
const getModerationStats = async (req, res) => {
  try {
    const [
      pendingUsersCount,
      pendingBuildsCount,
      flaggedCommentsCount,
      totalActions,
      recentActions,
    ] = await Promise.all([
      Customer.countDocuments({ approved: false }),
      Build.countDocuments({ approved: false }),
      Comment.countDocuments({ flagged: true }),
      ModerationAction.countDocuments(),
      ModerationAction.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      }),
    ]);

    res.send({
      pendingUsers: pendingUsersCount,
      pendingBuilds: pendingBuildsCount,
      flaggedComments: flaggedCommentsCount,
      totalActions,
      recentActions,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getModerationQueue,
  disableUser,
  disableBuild,
  deleteCommentAdmin,
  deletePostAdmin,
  unflagComment,
  getModerationLogs,
  getModerationStats,
};

