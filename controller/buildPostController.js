const BuildPost = require('../models/BuildPost');
const Build = require('../models/Build');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');

/**
 * Get all posts for a build (chronological)
 * GET /api/builds/:id/posts
 */
const getBuildPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify build exists
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Get posts chronologically (newest first)
    const [posts, total] = await Promise.all([
      BuildPost.find({ build_id: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BuildPost.countDocuments({ build_id: id }),
    ]);

    res.send({
      posts,
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
 * Add a post to a build
 * POST /api/builds/:id/posts
 */
const addBuildPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, media_urls } = req.body;
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

    // Verify build exists and user owns it
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    if (build.user_id.toString() !== userId.toString()) {
      return res.status(403).send({
        message: 'You can only add posts to your own builds',
      });
    }

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return res.status(400).send({
        message: 'Post title is required',
      });
    }

    if (!body || body.trim().length === 0) {
      return res.status(400).send({
        message: 'Post body is required',
      });
    }

    // Validate media URLs if provided
    if (media_urls && Array.isArray(media_urls)) {
      // Validate each URL (basic check)
      for (const url of media_urls) {
        if (typeof url !== 'string' || url.trim().length === 0) {
          return res.status(400).send({
            message: 'Invalid media URL',
          });
        }
      }
    }

    // Create post
    const newPost = new BuildPost({
      build_id: id,
      title: title.trim(),
      body: body.trim(),
      media_urls: media_urls || [],
    });

    await newPost.save();

    res.status(201).send({
      message: 'Post added successfully',
      post: newPost,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Update a build post
 * PATCH /api/posts/:id
 */
const updateBuildPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, media_urls } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const post = await BuildPost.findById(id).populate('build_id');
    if (!post) {
      return res.status(404).send({
        message: 'Post not found',
      });
    }

    // Check ownership (users can only update posts on their own builds)
    if (post.build_id.user_id.toString() !== userId.toString()) {
      return res.status(403).send({
        message: 'You can only update posts on your own builds',
      });
    }

    // Update fields
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).send({
          message: 'Post title cannot be empty',
        });
      }
      post.title = title.trim();
    }

    if (body !== undefined) {
      if (!body || body.trim().length === 0) {
        return res.status(400).send({
          message: 'Post body cannot be empty',
        });
      }
      post.body = body.trim();
    }

    if (media_urls !== undefined) {
      if (Array.isArray(media_urls)) {
        // Validate URLs
        for (const url of media_urls) {
          if (typeof url !== 'string' || url.trim().length === 0) {
            return res.status(400).send({
              message: 'Invalid media URL',
            });
          }
        }
        post.media_urls = media_urls;
      }
    }

    await post.save();

    res.send({
      message: 'Post updated successfully',
      post,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Delete a build post
 * DELETE /api/posts/:id
 */
const deleteBuildPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const post = await BuildPost.findById(id).populate('build_id');
    if (!post) {
      return res.status(404).send({
        message: 'Post not found',
      });
    }

    // Check ownership (users can only delete posts on their own builds)
    if (post.build_id.user_id.toString() !== userId.toString()) {
      return res.status(403).send({
        message: 'You can only delete posts on your own builds',
      });
    }

    await BuildPost.findByIdAndDelete(id);

    res.send({
      message: 'Post deleted successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getBuildPosts,
  addBuildPost,
  updateBuildPost,
  deleteBuildPost,
};

