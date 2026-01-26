const Customer = require('../models/Customer');
const ModerationAction = require('../models/ModerationAction');
const { validateHandleFormat, normalizeHandle } = require('../utils/handleValidation');

/**
 * Check if a handle is available
 * POST /api/users/handle/check
 */
const checkHandleAvailability = async (req, res) => {
  try {
    const { handle } = req.body;

    if (!handle) {
      return res.status(400).send({
        message: 'Handle is required',
      });
    }

    // Validate handle format
    const validation = validateHandleFormat(handle);
    if (!validation.valid) {
      return res.status(400).send({
        message: validation.error,
        available: false,
      });
    }

    const normalizedHandle = normalizeHandle(handle);

    // Check if handle exists in database
    const existingCustomer = await Customer.findOne({ handle: normalizedHandle });

    if (existingCustomer) {
      return res.send({
        available: false,
        message: 'This handle is already taken',
      });
    }

    res.send({
      available: true,
      message: 'Handle is available',
      normalized: normalizedHandle,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Set or update user handle
 * PATCH /api/users/:id/handle
 */
const setUserHandle = async (req, res) => {
  try {
    const { id } = req.params;
    const { handle } = req.body;

    if (!handle) {
      return res.status(400).send({
        message: 'Handle is required',
      });
    }

    // Validate handle format
    const validation = validateHandleFormat(handle);
    if (!validation.valid) {
      return res.status(400).send({
        message: validation.error,
      });
    }

    const normalizedHandle = normalizeHandle(handle);

    // Check if handle is already taken by another user
    const existingCustomer = await Customer.findOne({
      handle: normalizedHandle,
      _id: { $ne: id },
    });

    if (existingCustomer) {
      return res.status(400).send({
        message: 'This handle is already taken',
      });
    }

    // Update customer handle
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    customer.handle = normalizedHandle;
    await customer.save();

    res.send({
      message: 'Handle updated successfully',
      handle: normalizedHandle,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Approve or reject a user account (Admin only)
 * POST /api/users/approve
 */
const approveUser = async (req, res) => {
  try {
    const { userId, approved, reason } = req.body;
    const moderatorId = req.user?._id; // From JWT token

    if (!userId) {
      return res.status(400).send({
        message: 'User ID is required',
      });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    const previousStatus = customer.approved;
    customer.approved = approved === true || approved === 'true';

    await customer.save();

    // Log moderation action
    const moderationAction = new ModerationAction({
      action_type: customer.approved ? 'approve_user' : 'reject_user',
      target_type: 'user',
      target_id: userId,
      moderator_id: moderatorId,
      reason: reason || (customer.approved ? 'User approved' : 'User rejected'),
    });
    await moderationAction.save();

    // Send notification via NCS
    const {
      notifyUserApproved,
      notifyUserRejected,
    } = require('../utils/cbsgNotificationService');

    if (customer.approved && !previousStatus) {
      await notifyUserApproved(userId, reason);
    } else if (!customer.approved && previousStatus) {
      await notifyUserRejected(userId, reason);
    }

    res.send({
      message: customer.approved ? 'User approved successfully' : 'User rejected successfully',
      approved: customer.approved,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get users pending approval (Admin only)
 * GET /api/users/pending
 */
const getPendingUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { approved: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { handle: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      Customer.find(query)
        .select('name email handle avatar_url provider createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Customer.countDocuments(query),
    ]);

    res.send({
      users,
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
 * Update user privacy settings
 * PATCH /api/users/:id/privacy
 */
const updatePrivacySettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_public, comment_permissions } = req.body;
    const userId = req.user?._id; // From JWT token

    // Users can only update their own privacy settings
    // Note: Admin check would need to be implemented based on your admin model
    if (userId && userId.toString() !== id) {
      // For now, allow only own updates. Admin override can be added later
      return res.status(403).send({
        message: 'You can only update your own privacy settings',
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    if (is_public !== undefined) {
      if (typeof is_public !== 'boolean') {
        return res.status(400).send({
          message: 'is_public must be a boolean',
        });
      }
      customer.is_public = is_public;
    }

    if (comment_permissions !== undefined) {
      if (!['everyone', 'followers', 'none'].includes(comment_permissions)) {
        return res.status(400).send({
          message: 'comment_permissions must be one of: everyone, followers, none',
        });
      }
      customer.comment_permissions = comment_permissions;
    }

    await customer.save();

    res.send({
      message: 'Privacy settings updated successfully',
      is_public: customer.is_public,
      comment_permissions: customer.comment_permissions,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get user profile with CBSG data
 * GET /api/users/:id/profile
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user?._id; // Optional: to check if viewer is following

    const customer = await Customer.findById(id).select(
      'name email handle avatar_url is_public approved provider comment_permissions createdAt'
    );

    if (!customer) {
      return res.status(404).send({
        message: 'User not found',
      });
    }

    // Check if user is approved (required for CBSG)
    if (!customer.approved) {
      return res.status(403).send({
        message: 'User account is pending approval',
      });
    }

    // If profile is private and viewer is not the owner, check if viewer is following
    // TODO: Implement follow check when Follow model is integrated
    // if (!customer.is_public && viewerId !== id) {
    //   const isFollowing = await Follow.findOne({
    //     follower_id: viewerId,
    //     following_id: id,
    //   });
    //   if (!isFollowing) {
    //     return res.status(403).send({
    //       message: 'This profile is private',
    //     });
    //   }
    // }

    res.send(customer);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  checkHandleAvailability,
  setUserHandle,
  approveUser,
  getPendingUsers,
  updatePrivacySettings,
  getUserProfile,
};

