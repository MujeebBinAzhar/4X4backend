const Build = require('../models/Build');
const BuildProduct = require('../models/BuildProduct');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');

/**
 * Get all products linked to a build
 * GET /api/builds/:id/products
 */
const getBuildProducts = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify build exists
    const build = await Build.findById(id);
    if (!build) {
      return res.status(404).send({
        message: 'Build not found',
      });
    }

    // Get all linked products
    const buildProducts = await BuildProduct.find({ build_id: id })
      .populate({
        path: 'product_id',
        select: '_id title slug image prices stock sku manufacturerSku status',
      })
      .sort({ linked_at: -1 });

    // Format products with live pricing and availability
    const products = buildProducts.map((bp) => {
      const product = bp.product_id;
      if (!product) {
        return null; // Product was deleted
      }

      // Get product title (handle multilingual)
      const title = product.title?.en || product.title || 'Untitled Product';
      
      // Get first image
      const image = Array.isArray(product.image) && product.image.length > 0
        ? product.image[0]
        : null;

      // Calculate final price (considering discount)
      const originalPrice = product.prices?.originalPrice || product.prices?.price || 0;
      const discount = product.prices?.discount || 0;
      const finalPrice = originalPrice - discount;

      // Stock status
      const stock = product.stock || 0;
      const inStock = stock > 0;
      const stockStatus = stock > 0 ? 'in_stock' : stock < 0 ? 'on_backorder' : 'out_of_stock';

      return {
        _id: bp._id,
        build_id: bp.build_id,
        product_id: product._id,
        name: title,
        slug: product.slug,
        image,
        price: finalPrice,
        originalPrice,
        discount,
        stock,
        inStock,
        stockStatus,
        sku: product.sku,
        manufacturerSku: product.manufacturerSku,
        status: product.status,
        linked_at: bp.linked_at,
        source: bp.source,
        product_url: `/product/${product.slug}`, // Frontend product page URL
      };
    }).filter(p => p !== null); // Remove null entries (deleted products)

    res.send({
      products,
      total: products.length,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Link one or more products to a build
 * POST /api/builds/:id/products
 */
const linkProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_ids, source = 'manual' } = req.body;
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
        message: 'You can only link products to your own builds',
      });
    }

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).send({
        message: 'product_ids array is required',
      });
    }

    // Validate source
    if (!['manual', 'order_history'].includes(source)) {
      return res.status(400).send({
        message: 'source must be either "manual" or "order_history"',
      });
    }

    // Verify all products exist
    const products = await Product.find({
      _id: { $in: product_ids },
      status: 'show', // Only link published products
    });

    if (products.length !== product_ids.length) {
      return res.status(400).send({
        message: 'One or more products not found or not published',
      });
    }

    // Link products (skip duplicates)
    const linkedProducts = [];
    const skippedProducts = [];

    for (const productId of product_ids) {
      try {
        const buildProduct = new BuildProduct({
          build_id: id,
          product_id: productId,
          source,
        });
        await buildProduct.save();
        linkedProducts.push(productId);
      } catch (err) {
        // Duplicate key error (product already linked)
        if (err.code === 11000) {
          skippedProducts.push(productId);
        } else {
          throw err;
        }
      }
    }

    res.status(201).send({
      message: 'Products linked successfully',
      linked: linkedProducts.length,
      skipped: skippedProducts.length,
      linked_products: linkedProducts,
      skipped_products: skippedProducts,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Unlink a product from a build
 * DELETE /api/builds/:id/products/:productId
 */
const unlinkProduct = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
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
        message: 'You can only unlink products from your own builds',
      });
    }

    // Remove the link
    const result = await BuildProduct.deleteOne({
      build_id: id,
      product_id: productId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: 'Product link not found',
      });
    }

    res.send({
      message: 'Product unlinked successfully',
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Search products for linking (by SKU, name, manufacturer SKU)
 * GET /api/builds/products/search
 */
const searchProducts = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).send({
        message: 'Search query is required',
      });
    }

    const searchTerm = q.trim();
    const searchLimit = Math.min(parseInt(limit), 50); // Max 50 results

    // Search products by title, SKU, manufacturer SKU, internal SKU
    const products = await Product.find({
      $or: [
        { 'title.en': { $regex: searchTerm, $options: 'i' } },
        { sku: { $regex: searchTerm, $options: 'i' } },
        { manufacturerSku: { $regex: searchTerm, $options: 'i' } },
        { internalSku: { $regex: searchTerm, $options: 'i' } },
      ],
      status: 'show', // Only published products
    })
      .select('_id title slug image prices stock sku manufacturerSku internalSku status')
      .limit(searchLimit);

    // Format products for response
    const formattedProducts = products.map((product) => {
      const title = product.title?.en || product.title || 'Untitled Product';
      const image = Array.isArray(product.image) && product.image.length > 0
        ? product.image[0]
        : null;

      const originalPrice = product.prices?.originalPrice || product.prices?.price || 0;
      const discount = product.prices?.discount || 0;
      const finalPrice = originalPrice - discount;
      const stock = product.stock || 0;

      return {
        _id: product._id,
        name: title,
        slug: product.slug,
        image,
        price: finalPrice,
        originalPrice,
        discount,
        stock,
        inStock: stock > 0,
        sku: product.sku,
        manufacturerSku: product.manufacturerSku,
        internalSku: product.internalSku,
        product_url: `/product/${product.slug}`,
      };
    });

    res.send({
      products: formattedProducts,
      total: formattedProducts.length,
      query: searchTerm,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get suggested products from user's order history
 * GET /api/builds/suggested-products
 */
const getSuggestedProducts = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { build_id } = req.query;

    if (!userId) {
      return res.status(401).send({
        message: 'Authentication required',
      });
    }

    // Get user's order history
    const orders = await Order.find({ user: userId })
      .select('cart createdAt')
      .sort({ createdAt: -1 })
      .limit(50); // Last 50 orders

    // Extract unique product IDs from order history
    const productIds = new Set();
    orders.forEach((order) => {
      if (Array.isArray(order.cart)) {
        order.cart.forEach((item) => {
          if (item.product?.id || item.productId) {
            const productId = item.product?.id || item.productId;
            productIds.add(productId.toString());
          }
        });
      }
    });

    if (productIds.size === 0) {
      return res.send({
        products: [],
        total: 0,
        message: 'No products found in order history',
      });
    }

    // Get products that are still published
    const products = await Product.find({
      _id: { $in: Array.from(productIds) },
      status: 'show',
    })
      .select('_id title slug image prices stock sku manufacturerSku status')
      .limit(100); // Limit to 100 products

    // If build_id is provided, exclude already linked products
    let linkedProductIds = new Set();
    if (build_id) {
      const buildProducts = await BuildProduct.find({ build_id })
        .select('product_id');
      buildProducts.forEach((bp) => {
        linkedProductIds.add(bp.product_id.toString());
      });
    }

    // Format products and exclude already linked ones
    const formattedProducts = products
      .filter((product) => !linkedProductIds.has(product._id.toString()))
      .map((product) => {
        const title = product.title?.en || product.title || 'Untitled Product';
        const image = Array.isArray(product.image) && product.image.length > 0
          ? product.image[0]
          : null;

        const originalPrice = product.prices?.originalPrice || product.prices?.price || 0;
        const discount = product.prices?.discount || 0;
        const finalPrice = originalPrice - discount;
        const stock = product.stock || 0;

        return {
          _id: product._id,
          name: title,
          slug: product.slug,
          image,
          price: finalPrice,
          originalPrice,
          discount,
          stock,
          inStock: stock > 0,
          sku: product.sku,
          manufacturerSku: product.manufacturerSku,
          product_url: `/product/${product.slug}`,
          source: 'order_history', // Indicate this came from order history
        };
      });

    res.send({
      products: formattedProducts,
      total: formattedProducts.length,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getBuildProducts,
  linkProducts,
  unlinkProduct,
  searchProducts,
  getSuggestedProducts,
};

