const Build = require('../models/Build');
const Customer = require('../models/Customer');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const BuildProduct = require('../models/BuildProduct');
const Product = require('../models/Product');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');

/**
 * Get trending builds (sorted by likes in last 7 days)
 * GET /api/builds/explore?type=trending
 */
const getTrendingBuilds = async (req, res) => {
  try {
    const { page = 1, limit = 20, make, model, tags } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = {
      approved: true,
      visibility: 'public',
    };

    // Apply filters
    if (make) {
      query['specs.make'] = { $regex: make, $options: 'i' };
    }
    if (model) {
      query['specs.model'] = { $regex: model, $options: 'i' };
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray.map(tag => tag.toLowerCase().trim()) };
    }

    // Aggregate to get builds sorted by recent likes
    const builds = await Build.aggregate([
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
          recentLikesCount: {
            $size: {
              $filter: {
                input: '$likes',
                as: 'like',
                cond: { $gte: ['$$like.createdAt', sevenDaysAgo] },
              },
            },
          },
        },
      },
      { $sort: { recentLikesCount: -1, likesCount: -1, createdAt: -1 } },
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
          recentLikesCount: 1,
          'user_id.name': 1,
          'user_id.email': 1,
          'user_id.handle': 1,
          'user_id.avatar_url': 1,
          _id: 1,
        },
      },
    ]);

    const total = await Build.countDocuments(query);

    res.send({
      builds,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      type: 'trending',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get latest builds
 * GET /api/builds/explore?type=latest
 */
const getLatestBuilds = async (req, res) => {
  try {
    const { page = 1, limit = 20, make, model, tags } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      approved: true,
      visibility: 'public',
    };

    // Apply filters
    if (make) {
      query['specs.make'] = { $regex: make, $options: 'i' };
    }
    if (model) {
      query['specs.model'] = { $regex: model, $options: 'i' };
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray.map(tag => tag.toLowerCase().trim()) };
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
      type: 'latest',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Explore builds (trending or latest)
 * GET /api/builds/explore
 */
const exploreBuilds = async (req, res) => {
  try {
    const { type = 'latest' } = req.query;

    if (type === 'trending') {
      return getTrendingBuilds(req, res);
    } else {
      return getLatestBuilds(req, res);
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get following feed (personalized feed from followed users)
 * GET /api/builds/feed
 */
const getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users that current user is following
    const follows = await Follow.find({ follower_id: userId })
      .select('following_id');

    if (follows.length === 0) {
      return res.send({
        builds: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        message: 'You are not following anyone yet. Follow users to see their builds in your feed.',
      });
    }

    const followingIds = follows.map(f => f.following_id);

    // Get builds from followed users
    const query = {
      user_id: { $in: followingIds },
      approved: true,
      visibility: 'public',
    };

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

/**
 * Search builds, handles, and product tags
 * GET /api/builds/search
 */
const searchBuilds = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, type = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!q || q.trim().length === 0) {
      return res.status(400).send({
        message: 'Search query is required',
      });
    }

    const searchTerm = q.trim();
    const results = {
      builds: [],
      users: [],
      products: [],
    };

    // Search builds
    if (type === 'all' || type === 'builds') {
      const buildQuery = {
        approved: true,
        visibility: 'public',
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [searchTerm.toLowerCase()] } },
        ],
      };

      const [builds, buildsTotal] = await Promise.all([
        Build.find(buildQuery)
          .populate('user_id', 'name email handle avatar_url')
          .sort({ createdAt: -1 })
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 5 : parseInt(limit)),
        Build.countDocuments(buildQuery),
      ]);

      // Get likes count
      const buildsWithLikes = await Promise.all(
        builds.map(async (build) => {
          const likesCount = await Like.countDocuments({ build_id: build._id });
          return {
            ...build.toObject(),
            likesCount,
          };
        })
      );

      results.builds = buildsWithLikes;
      results.buildsTotal = buildsTotal;
    }

    // Search users by handle or name
    if (type === 'all' || type === 'users') {
      const userQuery = {
        approved: true,
        $or: [
          { handle: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } },
        ],
      };

      const [users, usersTotal] = await Promise.all([
        Customer.find(userQuery)
          .select('name email handle avatar_url')
          .limit(type === 'all' ? 5 : parseInt(limit))
          .skip(type === 'all' ? 0 : skip),
        Customer.countDocuments(userQuery),
      ]);

      results.users = users;
      results.usersTotal = usersTotal;
    }

    // Search products (linked to builds)
    if (type === 'all' || type === 'products') {
      // First find products matching search
      const productQuery = {
        status: 'show',
        $or: [
          { 'title.en': { $regex: searchTerm, $options: 'i' } },
          { sku: { $regex: searchTerm, $options: 'i' } },
          { manufacturerSku: { $regex: searchTerm, $options: 'i' } },
        ],
      };

      const products = await Product.find(productQuery)
        .select('_id title slug image prices stock sku')
        .limit(type === 'all' ? 5 : parseInt(limit));

      // Find builds that have these products linked
      if (products.length > 0) {
        const productIds = products.map(p => p._id);
        const buildProducts = await BuildProduct.find({
          product_id: { $in: productIds },
        }).select('build_id');

        const buildIds = [...new Set(buildProducts.map(bp => bp.build_id.toString()))];

        if (buildIds.length > 0) {
          const buildsWithProducts = await Build.find({
            _id: { $in: buildIds },
            approved: true,
            visibility: 'public',
          })
            .populate('user_id', 'name email handle avatar_url')
            .limit(type === 'all' ? 5 : parseInt(limit));

          // Format products with build info
          const formattedProducts = products.slice(0, type === 'all' ? 5 : parseInt(limit)).map((product) => {
            const title = product.title?.en || product.title || 'Untitled Product';
            const image = Array.isArray(product.image) && product.image.length > 0
              ? product.image[0]
              : null;

            return {
              _id: product._id,
              name: title,
              slug: product.slug,
              image,
              sku: product.sku,
              product_url: `/product/${product.slug}`,
            };
          });

          results.products = formattedProducts;
          results.productsTotal = products.length;
        }
      }
    }

    res.send({
      query: searchTerm,
      type,
      ...results,
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
 * Get available filters (makes, models, tags)
 * GET /api/builds/filters
 */
const getAvailableFilters = async (req, res) => {
  try {
    const query = {
      approved: true,
      visibility: 'public',
    };

    // Get distinct makes
    const makes = await Build.distinct('specs.make', {
      ...query,
      'specs.make': { $exists: true, $ne: null, $ne: '' },
    });

    // Get distinct models
    const models = await Build.distinct('specs.model', {
      ...query,
      'specs.model': { $exists: true, $ne: null, $ne: '' },
    });

    // Get all tags (flatten and get unique)
    const builds = await Build.find(query).select('tags');
    const allTags = [];
    builds.forEach((build) => {
      if (build.tags && Array.isArray(build.tags)) {
        allTags.push(...build.tags);
      }
    });
    const uniqueTags = [...new Set(allTags)].sort();

    res.send({
      makes: makes.filter(m => m).sort(),
      models: models.filter(m => m).sort(),
      tags: uniqueTags,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  exploreBuilds,
  getTrendingBuilds,
  getLatestBuilds,
  getFollowingFeed,
  searchBuilds,
  getAvailableFilters,
};

