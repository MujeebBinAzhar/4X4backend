const Build = require('../models/Build');
const Customer = require('../models/Customer');
const ModerationAction = require('../models/ModerationAction');
const Like = require('../models/Like');
const { getCBSGStatus, canUserCreateBuild } = require('../utils/cbsgMasterSwitch');

/**
 * Get all builds with filtering, pagination, and search
 * GET /api/builds
 */
const getAllBuilds = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      approved,
      visibility,
      user_id,
      make,
      model,
      tags,
      sort_by = 'createdAt',
      sort_dir = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // Only show approved builds for public access (unless admin)
    if (approved === undefined) {
      query.approved = true;
    } else if (approved === 'false' || approved === false) {
      query.approved = false;
    } else if (approved === 'true' || approved === true) {
      query.approved = true;
    }

    // Visibility filter
    if (visibility) {
      query.visibility = visibility;
    } else {
      // Default: only show public builds
      query.visibility = 'public';
    }

    // User filter
    if (user_id) {
      query.user_id = user_id;
    }

    // Search by build name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Vehicle specs filters
    if (make) {
      query['specs.make'] = { $regex: make, $options: 'i' };
    }
    if (model) {
      query['specs.model'] = { $regex: model, $options: 'i' };
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray.map(tag => tag.toLowerCase().trim()) };
    }

    let builds;
    let total = await Build.countDocuments(query);

    // If sorting by popularity, use aggregation
    if (sort_by === 'popularity') {
      const sortDir = sort_dir === 'asc' ? 1 : -1;
      
      builds = await Build.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'build_id',
            as: 'likes',
          },
        },
        {
          $addFields: {
            likesCount: { $size: '$likes' },
          },
        },
        { $sort: { likesCount: sortDir, createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'customers',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user_id',
          },
        },
        {
          $unwind: {
            path: '$user_id',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            specs: 1,
            tags: 1,
            visibility: 1,
            approved: 1,
            hero_image_url: 1,
            media_urls: 1,
            createdAt: 1,
            updatedAt: 1,
            likesCount: 1,
            'user_id.name': 1,
            'user_id.email': 1,
            'user_id.handle': 1,
            'user_id.avatar_url': 1,
            _id: 1,
          },
        },
      ]);

      // Convert aggregation results to include likesCount
      builds = builds.map(build => ({
        ...build,
        likesCount: build.likesCount || 0,
      }));
    } else {
      // Regular sorting
      const sortOptions = {};
      sortOptions[sort_by] = sort_dir === 'asc' ? 1 : -1;

      builds = await Build.find(query)
        .populate('user_id', 'name email handle avatar_url')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      // Get likes count for each build
      builds = await Promise.all(
        builds.map(async (build) => {
          const likesCount = await Like.countDocuments({ build_id: build._id });
          return {
            ...build.toObject(),
            likesCount,
          };
        })
      );
    }

    res.send({
      builds: buildsWithLikes,
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
 * Get a single build by ID with all populated data
 * GET /api/builds/:id
 */
const getBuildById = async (req, res) => {
  try {
    const { id } = req.params;

    const build = await Build.findById(id).populate(
      'user_id',
      'name email handle avatar_url is_public approved'
    );

    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Check if build is approved (unless admin or owner)
    const userId = req.user?._id;
    const isOwner = userId && build.user_id._id.toString() === userId.toString();
    
    if (!build.approved && !isOwner) {
      return res.status(403).send({
        message: 'This build is pending approval',
      });
    }

    // Get likes count
    const likesCount = await Like.countDocuments({ build_id: build._id });
    
    // Check if current user has liked this build
    let userLiked = false;
    if (userId) {
      const like = await Like.findOne({ build_id: id, user_id: userId });
      userLiked = !!like;
    }

    res.send({
      ...build.toObject(),
      likesCount,
      userLiked,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Create a new build
 * POST /api/builds
 */
const createBuild = async (req, res) => {
  try {
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

    // Check if user is approved
    const userCheck = await canUserCreateBuild(userId);
    if (!userCheck.allowed) {
      return res.status(403).send({
        message: userCheck.reason,
      });
    }

    // Validate and sanitize required fields
    const { sanitizeText, sanitizeArray, sanitizeObject } = require('../utils/inputSanitizer');
    const { logBuildAction } = require('../utils/auditLogger');
    
    let { name, description, specs, tags, visibility, hero_image_url, media_urls } = req.body;

    // Sanitize inputs
    name = sanitizeText(name, { maxLength: 100 });
    description = description ? sanitizeText(description, { maxLength: 2000 }) : '';
    specs = specs ? sanitizeObject(specs) : {};
    tags = tags ? sanitizeArray(tags, { maxLength: 30 }) : [];
    
    // Sanitize URLs
    const { sanitizeUrl } = require('../utils/inputSanitizer');
    hero_image_url = hero_image_url ? sanitizeUrl(hero_image_url) : null;
    media_urls = Array.isArray(media_urls) 
      ? media_urls.map(url => sanitizeUrl(url)).filter(url => url !== null)
      : [];

    if (!name || name.trim().length === 0) {
      return res.status(400).send({
        message: 'Build name is required',
      });
    }

    // Validate visibility
    if (visibility && !['public', 'private'].includes(visibility)) {
      return res.status(400).send({
        message: 'Visibility must be either "public" or "private"',
      });
    }

    // Validate year if provided
    if (specs?.year) {
      const currentYear = new Date().getFullYear();
      if (specs.year < 1900 || specs.year > currentYear + 1) {
        return res.status(400).send({
          message: `Year must be between 1900 and ${currentYear + 1}`,
        });
      }
    }

    // Normalize tags (already sanitized)
    let normalizedTags = [];
    if (tags && Array.isArray(tags)) {
      normalizedTags = tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 10); // Limit to 10 tags
    }

    // Create build
    const newBuild = new Build({
      user_id: userId,
      name: name.trim(),
      description: description || '',
      specs: specs || {},
      tags: normalizedTags,
      visibility: visibility || 'public',
      approved: false, // Default to pending approval
      hero_image_url: hero_image_url || null,
      media_urls: media_urls || [],
    });

    await newBuild.save();

    // Populate user data
    await newBuild.populate('user_id', 'name email handle avatar_url');

    // Log audit event
    await logBuildAction(req, 'BUILD_CREATED', newBuild._id, {
      buildName: name,
      visibility,
    });

    res.status(201).send({
      message: 'Build created successfully. Pending approval.',
      build: newBuild,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Update an existing build
 * PATCH /api/builds/:id
 */
const updateBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Check ownership (users can only update their own builds, unless admin)
    if (build.user_id.toString() !== userId.toString()) {
      // TODO: Add admin check
      return res.status(403).send({
        message: 'You can only update your own builds',
      });
    }

    // Update fields
    const { name, description, specs, tags, visibility, hero_image_url, media_urls } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).send({
          message: 'Build name cannot be empty',
        });
      }
      build.name = name.trim();
    }

    if (description !== undefined) {
      build.description = description;
    }

    if (specs !== undefined) {
      // Validate year if provided
      if (specs.year) {
        const currentYear = new Date().getFullYear();
        if (specs.year < 1900 || specs.year > currentYear + 1) {
          return res.status(400).send({
            message: `Year must be between 1900 and ${currentYear + 1}`,
          });
        }
      }
      build.specs = { ...build.specs, ...specs };
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        build.tags = tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0)
          .slice(0, 10);
      }
    }

    if (visibility !== undefined) {
      if (!['public', 'private'].includes(visibility)) {
        return res.status(400).send({
          message: 'Visibility must be either "public" or "private"',
        });
      }
      build.visibility = visibility;
    }

    if (hero_image_url !== undefined) {
      build.hero_image_url = hero_image_url;
    }

    if (media_urls !== undefined) {
      if (Array.isArray(media_urls)) {
        build.media_urls = media_urls;
      }
    }

    // If build was approved and user makes changes, reset approval status
    if (build.approved && (name || description || specs || tags || visibility)) {
      build.approved = false;
    }

    await build.save();
    await build.populate('user_id', 'name email handle avatar_url');

    res.send({
      message: 'Build updated successfully',
      build,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Delete a build
 * DELETE /api/builds/:id
 */
const deleteBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Check ownership (users can only delete their own builds, unless admin)
    if (build.user_id.toString() !== userId.toString()) {
      // TODO: Add admin check
      return res.status(403).send({
        message: 'You can only delete your own builds',
      });
    }

    // TODO: Delete associated data (likes, comments, posts, products)
    // For now, just delete the build
    await Build.findByIdAndDelete(id);

    res.send({
      message: 'Build deleted successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Approve or reject a build (Admin only)
 * PATCH /api/builds/:id/approve
 */
const approveBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    const moderatorId = req.user?._id; // From JWT token

    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    const previousStatus = build.approved;
    build.approved = approved === true || approved === 'true';

    await build.save();

    // Log moderation action
    const moderationAction = new ModerationAction({
      action_type: build.approved ? 'approve_build' : 'reject_build',
      target_type: 'build',
      target_id: id,
      moderator_id: moderatorId,
      reason: reason || (build.approved ? 'Build approved' : 'Build rejected'),
    });
    await moderationAction.save();

    // Send notification via NCS
    const {
      notifyBuildApproved,
      notifyBuildRejected,
    } = require('../utils/cbsgNotificationService');

    if (build.approved && !previousStatus) {
      await notifyBuildApproved(id, build.user_id, build.name);
    } else if (!build.approved && previousStatus) {
      await notifyBuildRejected(id, build.user_id, build.name, reason);
    }

    res.send({
      message: build.approved ? 'Build approved successfully' : 'Build rejected successfully',
      approved: build.approved,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get builds by user ID
 * GET /api/builds/user/:userId
 */
const getBuildsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, approved } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { user_id: userId };

    // Filter by approval status
    if (approved !== undefined) {
      query.approved = approved === 'true' || approved === true;
    } else {
      // Default: only show approved builds
      query.approved = true;
    }

    const [builds, total] = await Promise.all([
      Build.find(query)
        .populate('user_id', 'name email handle avatar_url')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Build.countDocuments(query),
    ]);

    // Get likes count for each build
    const buildsWithLikes = await Promise.all(
      builds.map(async (build) => {
        const likesCount = await Like.countDocuments({ build_id: build._id });
        return {
          ...build.toObject(),
          likesCount,
        };
      })
    );

    res.send({
      builds: buildsWithLikes,
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

module.exports = {
  getAllBuilds,
  getBuildById,
  createBuild,
  updateBuild,
  deleteBuild,
  approveBuild,
  getBuildsByUser,
};

