const Comment = require('../models/Comment');
const Build = require('../models/Build');
const Customer = require('../models/Customer');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');
const { parseMentions, validateMentions, getMentionedUserIds } = require('../utils/mentionParser');
const { sanitizeComment } = require('../utils/inputSanitizer');
const { logUserAction } = require('../utils/auditLogger');

/**
 * Get comments for a build
 * GET /api/builds/:id/comments
 */
const getBuildComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, parent_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify build exists
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Build query
    const query = { build_id: id };
    if (parent_id) {
      // Get replies to a specific comment
      query.parent_comment_id = parent_id;
    } else {
      // Get top-level comments only
      query.parent_comment_id = null;
    }

    // Get comments with user information
    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('user_id', 'name email handle avatar_url approved')
        .populate('parent_comment_id', 'body user_id')
        .sort({ createdAt: parent_id ? 1 : -1 }) // Replies: oldest first, top-level: newest first
        .skip(skip)
        .limit(parseInt(limit)),
      Comment.countDocuments(query),
    ]);

    // Get reply counts for top-level comments
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        let replyCount = 0;
        if (!parent_id && !comment.parent_comment_id) {
          replyCount = await Comment.countDocuments({
            parent_comment_id: comment._id,
          });
        }

        return {
          _id: comment._id,
          build_id: comment.build_id,
          user: {
            _id: comment.user_id._id,
            name: comment.user_id.name,
            handle: comment.user_id.handle,
            avatar_url: comment.user_id.avatar_url,
          },
          body: comment.body,
          flagged: comment.flagged,
          parent_comment_id: comment.parent_comment_id,
          replyCount,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      })
    );

    res.send({
      comments: commentsWithReplies,
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
 * Add a comment to a build
 * POST /api/builds/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    let { body, parent_comment_id } = req.body;
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

    // Verify user is approved
    const user = await Customer.findById(userId);
    if (!user || !user.approved) {
      return res.status(403).send({
        message: 'Your account must be approved to comment',
      });
    }

    // Verify build exists
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Check build owner's comment permissions
    const buildOwner = await Customer.findById(build.user_id);
    if (buildOwner) {
      if (buildOwner.comment_permissions === 'none') {
        return res.status(403).send({
          message: 'Comments are disabled for this build',
        });
      }

      if (buildOwner.comment_permissions === 'followers') {
        // Check if user is following build owner
        const Follow = require('../models/Follow');
        const isFollowing = await Follow.findOne({
          follower_id: userId,
          following_id: build.user_id,
        });

        if (!isFollowing && build.user_id.toString() !== userId.toString()) {
          return res.status(403).send({
            message: 'Only followers can comment on this build',
          });
        }
      }
    }

    // Sanitize and validate comment body
    body = sanitizeComment(body);
    if (!body) {
      return res.status(400).send({
        message: 'Comment body is required and must be valid (max 1000 characters)',
      });
    }

    // Validate parent comment if replying
    if (parent_comment_id) {
      const parentComment = await Comment.findById(parent_comment_id);
      if (!parentComment) {
        return res.status(404).send({
          message: 'Parent comment not found',
        });
      }

      if (parentComment.build_id.toString() !== id) {
        return res.status(400).send({
          message: 'Parent comment does not belong to this build',
        });
      }
    }

    // Parse and validate @mentions
    const mentionedHandles = parseMentions(body);
    const mentionValidation = await validateMentions(mentionedHandles);

    // Create comment
    const newComment = new Comment({
      build_id: id,
      user_id: userId,
      body: body.trim(),
      parent_comment_id: parent_comment_id || null,
      flagged: false,
    });

    await newComment.save();
    await newComment.populate('user_id', 'name email handle avatar_url');

    // Log audit event
    await logUserAction(req, 'COMMENT_CREATED', {
      buildId: id,
      commentId: newComment._id,
      isReply: !!parent_comment_id,
    });

    // Get mentioned user IDs for notifications
    const mentionedUserIds = await getMentionedUserIds(mentionValidation.valid);

    // Send notifications via NCS
    const {
      notifyBuildCommented,
      notifyCommentReply,
      notifyUserMentioned,
    } = require('../utils/cbsgNotificationService');

    // 1. Notify build owner (if not the commenter)
    if (build.user_id.toString() !== userId.toString()) {
      await notifyBuildCommented(id, build.user_id, userId, build.name);
    }

    // 2. Notify mentioned users
    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId !== userId.toString()) {
        await notifyUserMentioned(mentionedUserId, userId, id, build.name);
      }
    }

    // 3. Notify parent comment author (if replying)
    if (parent_comment_id) {
      const parentComment = await Comment.findById(parent_comment_id).populate('user_id');
      if (parentComment && parentComment.user_id._id.toString() !== userId.toString()) {
        await notifyCommentReply(parent_comment_id, parentComment.user_id._id, userId, build.name);
      }
    }

    res.status(201).send({
      message: 'Comment added successfully',
      comment: {
        _id: newComment._id,
        build_id: newComment.build_id,
        user: {
          _id: newComment.user_id._id,
          name: newComment.user_id.name,
          handle: newComment.user_id.handle,
          avatar_url: newComment.user_id.avatar_url,
        },
        body: newComment.body,
        parent_comment_id: newComment.parent_comment_id,
        createdAt: newComment.createdAt,
      },
      mentions: {
        valid: mentionValidation.valid,
        invalid: mentionValidation.invalid,
      },
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Update a comment
 * PATCH /api/comments/:id
 */
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).send({
        message: 'Comment not found',
      });
    }

    // Check ownership (users can only edit their own comments)
    if (comment.user_id.toString() !== userId.toString()) {
      // TODO: Add admin check
      return res.status(403).send({
        message: 'You can only edit your own comments',
      });
    }

    // Validate body
    if (!body || body.trim().length === 0) {
      return res.status(400).send({
        message: 'Comment body is required',
      });
    }

    if (body.trim().length > 1000) {
      return res.status(400).send({
        message: 'Comment cannot exceed 1000 characters',
      });
    }

    // Parse and validate @mentions
    const mentionedHandles = parseMentions(body);
    const mentionValidation = await validateMentions(mentionedHandles);

    // Update comment
    comment.body = body.trim();
    await comment.save();
    await comment.populate('user_id', 'name email handle avatar_url');

    res.send({
      message: 'Comment updated successfully',
      comment: {
        _id: comment._id,
        build_id: comment.build_id,
        user: {
          _id: comment.user_id._id,
          name: comment.user_id.name,
          handle: comment.user_id.handle,
          avatar_url: comment.user_id.avatar_url,
        },
        body: comment.body,
        parent_comment_id: comment.parent_comment_id,
        updatedAt: comment.updatedAt,
      },
      mentions: {
        valid: mentionValidation.valid,
        invalid: mentionValidation.invalid,
      },
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).send({
        message: 'Comment not found',
      });
    }

    // Check ownership or build ownership (users can delete their own comments or build owners can delete any comment on their build)
    const build = await Build.findById(comment.build_id);
    const isCommentOwner = comment.user_id.toString() === userId.toString();
    const isBuildOwner = build && build.user_id.toString() === userId.toString();

    if (!isCommentOwner && !isBuildOwner) {
      // TODO: Add admin check
      return res.status(403).send({
        message: 'You can only delete your own comments or comments on your builds',
      });
    }

    // Delete comment and all its replies
    await Comment.deleteMany({
      $or: [
        { _id: id },
        { parent_comment_id: id },
      ],
    });

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
 * Flag a comment for moderation
 * POST /api/comments/:id/flag
 */
const flagComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).send({
        message: 'Comment not found',
      });
    }

    // Flag the comment
    comment.flagged = true;
    await comment.save();

    // Send notification to admins via NCS
    const {
      notifyContentFlagged,
    } = require('../utils/cbsgNotificationService');
    await notifyContentFlagged('comment', id, userId, 'Comment flagged by user');

    res.send({
      message: 'Comment flagged for moderation',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getBuildComments,
  addComment,
  updateComment,
  deleteComment,
  flagComment,
};

