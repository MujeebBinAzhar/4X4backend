const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const { languageCodes } = require("../utils/data");
const Review = require("../models/Review");
const ProductAuditLog = require("../models/ProductAuditLog"); // Phase 6: Audit logging

// Phase 6: Helper function to log product changes
const logProductChange = async (
  productId,
  userId,
  userName,
  action,
  changes,
  req
) => {
  try {
    await ProductAuditLog.create({
      productId,
      userId: userId || null,
      userName: userName || "System",
      action,
      changes,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"] || "",
    });
  } catch (err) {
    // Don't fail the request if logging fails
    console.error("Failed to log product change:", err.message);
  }
};

const getSearchResult = async (req, res) => {
  try {
    const { query, limitProducts = 4 } = req.query;

    let products;

    if (!query) {
      // Return any products if query is not provided
      products = await Product.aggregate([
        {
          $lookup: {
            from: "reviews", // Review collection name
            localField: "_id", // Product's _id
            foreignField: "product", // Review's product field
            as: "reviews", // The resulting reviews array
          },
        },
        {
          $addFields: {
            reviews: {
              $filter: {
                input: "$reviews", // Filter reviews array
                as: "review",
                cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
              },
            },
          },
        },
        { $limit: parseInt(limitProducts) },
      ]);
    } else {
      const queryVal = query.toLowerCase();

      // Search products by title or SKU
      products = await Product.aggregate([
        {
          $match: {
            $or: [
              { "title.en": { $regex: queryVal, $options: "i" } }, // Assuming "en" is the language key in the title object
              { sku: { $regex: queryVal, $options: "i" } },
            ],
          },
        },
        {
          $lookup: {
            from: "reviews", // Review collection name
            localField: "_id", // Product's _id
            foreignField: "product", // Review's product field
            as: "reviews", // The resulting reviews array
          },
        },
        {
          $addFields: {
            reviews: {
              $filter: {
                input: "$reviews", // Filter reviews array
                as: "review",
                cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
              },
            },
          },
        },
        { $limit: parseInt(limitProducts) },
      ]);
    }

    return res.send(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res
      .status(500)
      .json({ error: "An error occurred while searching for products" });
  }
};
const addProduct = async (req, res) => {
  try {
    // Ensure quickDiscount structure is properly set
    const quickDiscountData = {
      dollarAmount: req.body.quickDiscount?.dollarAmount || 0,
      percentageAmount: req.body.quickDiscount?.percentageAmount || 0,
      isActive: req.body.quickDiscount?.isActive || false,
    };

    // Ensure prices structure is properly set
    const pricesData = {
      originalPrice:
        req.body.prices?.originalPrice || req.body.originalPrice || 0,
      tradePrice: req.body.prices?.tradePrice || req.body.tradePrice || 0,
      price: req.body.prices?.price || req.body.price || 0,
      discount: req.body.prices?.discount || req.body.discount || 0,
    };

    // Parse tags safely - handle stringified JSON or array
    const parseTags = (tagData) => {
      if (!tagData) return [];

      if (Array.isArray(tagData)) {
        return tagData.filter(
          (tag) => tag && typeof tag === "string" && tag.trim()
        );
      }

      if (typeof tagData === "string") {
        let current = tagData;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          try {
            const parsed = JSON.parse(current);

            if (Array.isArray(parsed)) {
              return parsed.filter(
                (tag) => tag && typeof tag === "string" && tag.trim()
              );
            }

            if (typeof parsed === "string") {
              current = parsed;
              attempts++;
              continue;
            }

            return [parsed].filter(
              (tag) => tag && typeof tag === "string" && tag.trim()
            );
          } catch (e) {
            if (
              current.trim() &&
              !current.startsWith("[") &&
              !current.startsWith('"')
            ) {
              return [current.trim()];
            }
            return [];
          }
        }

        return [];
      }

      return [];
    };

    // Remove marginType and discountType from req.body to avoid validation issues
    // These fields are deprecated and should not be set
    const { marginType, discountType, ...restBody } = req.body;

    const productData = {
      ...restBody,
      productId: req.body.productId
        ? req.body.productId
        : mongoose.Types.ObjectId(),
      quickDiscount: quickDiscountData,
      prices: pricesData,
      tag: parseTags(req.body.tag),
      // marginType and discountType are deprecated - don't include them
    };

    const newProduct = new Product(productData);

    await newProduct.save();

    // Phase 6: Log product creation
    await logProductChange(
      newProduct._id,
      req.user?._id,
      req.user?.name,
      "create",
      { product: newProduct.toObject() },
      req
    );

    res.send(newProduct);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Phase 4: Duplicate product
const duplicateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the original product
    const originalProduct = await Product.findById(id);

    if (!originalProduct) {
      return res.status(404).send({
        message: "Product not found",
      });
    }

    // Create a copy of the product data
    const productData = originalProduct.toObject();

    // Remove _id and __v to create a new document
    delete productData._id;
    delete productData.__v;
    delete productData.createdAt;
    delete productData.updatedAt;

    // Generate new productId
    productData.productId = mongoose.Types.ObjectId();

    // Parse and clean tags using recursive parser
    const parseTags = (tagData) => {
      if (!tagData) return [];

      if (Array.isArray(tagData)) {
        return tagData.filter(
          (tag) => tag && typeof tag === "string" && tag.trim()
        );
      }

      if (typeof tagData === "string") {
        let current = tagData;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          try {
            const parsed = JSON.parse(current);

            if (Array.isArray(parsed)) {
              return parsed.filter(
                (tag) => tag && typeof tag === "string" && tag.trim()
              );
            }

            if (typeof parsed === "string") {
              current = parsed;
              attempts++;
              continue;
            }

            return [parsed].filter(
              (tag) => tag && typeof tag === "string" && tag.trim()
            );
          } catch (e) {
            if (
              current.trim() &&
              !current.startsWith("[") &&
              !current.startsWith('"')
            ) {
              return [current.trim()];
            }
            return [];
          }
        }

        return [];
      }

      return [];
    };

    productData.tag = parseTags(productData.tag);

    // Modify title and slug to indicate it's a copy
    if (productData.title && typeof productData.title === "object") {
      Object.keys(productData.title).forEach((lang) => {
        if (productData.title[lang]) {
          productData.title[lang] = `${productData.title[lang]} (Copy)`;
        }
      });
    } else if (typeof productData.title === "string") {
      productData.title = `${productData.title} (Copy)`;
    }

    // Modify slug to make it unique
    if (productData.slug) {
      productData.slug = `${productData.slug}-copy-${Date.now()}`;
    }

    // Set status to "hide" (draft) for the duplicate
    productData.status = "hide";

    // Create new product
    const duplicatedProduct = new Product(productData);
    await duplicatedProduct.save();

    // Phase 6: Log duplication
    await logProductChange(
      duplicatedProduct._id,
      req.user?._id,
      req.user?.name,
      "duplicate",
      { sourceProductId: id },
      req
    );

    res.send({
      message: "Product duplicated successfully",
      product: duplicatedProduct,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const topRatedProduct = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const topRatedProducts = await Product.aggregate([
      {
        $lookup: {
          from: "reviews", // Review collection name
          localField: "_id", // Product's _id
          foreignField: "product", // Review's product field
          as: "reviews", // The resulting reviews array
        },
      },
      {
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews", // Filter reviews array
              as: "review",
              cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
            },
          },
        },
      },
      {
        $addFields: {
          reviewCount: { $size: "$reviews" }, // Add a field with the count of reviews
        },
      },
      {
        $sort: { reviewCount: -1 }, // Sort by the review count in descending order
      },
      {
        $limit: limit, // Limit the results to the specified number
      },
    ]);

    res.status(200).send(topRatedProducts);
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const specialOfferProduct = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const specialOffers = await Product.aggregate([
      {
        $lookup: {
          from: "reviews", // Review collection name
          localField: "_id", // Product's _id
          foreignField: "product", // Review's product field
          as: "reviews", // The resulting reviews array
        },
      },
      {
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews", // Filter reviews array
              as: "review",
              cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
            },
          },
        },
      },
      { $match: { "prices.discount": { $gt: 0 } } }, // Only products with discounts
      { $sample: { size: limit } }, // Randomize products
    ]);

    res.status(200).send(specialOffers);
  } catch (error) {
    console.error("Error fetching special offers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const bestSellerProduct = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const bestSellers = await Product.aggregate([
      {
        $match: { sales: { $gt: 0 } }, // Ensure products have sales
      },
      {
        $lookup: {
          from: "reviews", // Review collection name
          localField: "_id", // Product's _id
          foreignField: "product", // Review's product field
          as: "reviews", // The resulting reviews array
        },
      },
      {
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews", // Filter reviews array
              as: "review",
              cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
            },
          },
        },
      },
      {
        $sort: { sales: -1 }, // Sort by highest sales
      },
      {
        $limit: limit, // Limit the number of products
      },
    ]);
    res.status(200).send(bestSellers);
  } catch (error) {
    console.error("Error fetching best seller products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const getNewArrivals = async (req, res) => {
  try {
    const daysAgo = 1000; // Define how many days back you want to consider for "new arrivals"
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10 if not provided
    const currentDate = new Date();
    const dateThreshold = new Date(
      currentDate.setDate(currentDate.getDate() - daysAgo)
    ); // Date 30 days ago

    // Fetch products with a limit and within the date range
    const newArrivals = await Product.find({
      createdAt: { $gte: dateThreshold },
    })
      .sort({ createdAt: -1 }) // Sort by most recent
      .limit(limit); // Apply limit

    if (newArrivals.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No new arrivals found." });
    }

    // Respond with the list of New Arrivals
    res.status(200).send(newArrivals);
  } catch (error) {
    console.error("Error fetching new arrivals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

async function getCategoryIds(input) {
  // Step 1: Split the string by "|"
  const segments = input.split("|");

  // Step 2: Extract the ending categories
  const endingCategories = segments.map((segment) => {
    const parts = segment.split(" > ");
    return parts[parts.length - 1]; // Get the last part of each segment
  });
  const defaultCategoryName = segments[0]?.split(" > ")?.[0];
  const defaultCategoryId = await Category.find({
    "name.en": { $in: [defaultCategoryName] },
  });

  // Step 3: Query MongoDB for matching categories
  const categoryDocs = await Category.find({
    "name.en": { $in: endingCategories },
  });

  // Step 4: Extract IDs as an array of strings
  const categoryIds = categoryDocs.map((doc) => doc._id.toString());

  return { categories: categoryIds, category: defaultCategoryId?.[0]?._id };
}

const addAllProducts = async (req, res) => {
  try {
    // console.log('product data',req.body)
    await Product.deleteMany();
    const payload = req.body;
    const updatedRes = await Promise.all(
      payload.map(async (element) => {
        const resp = await getCategoryIds(element?.category); // Ensure this resolves before moving forward
        return {
          ...element,
          category: resp?.category,
          categories: resp?.categories,
          // Ensure new fields are properly handled
          prices: {
            originalPrice: element.prices?.originalPrice || 0,
            price: element.prices?.price || 0,
            discount: element.prices?.discount || 0,
            tradePrice: element.prices?.tradePrice || 0,
          },
          profitMargin: {
            dollarDifference: element.profitMargin?.dollarDifference || 0,
            percentageDifference:
              element.profitMargin?.percentageDifference || 0,
          },
          quickDiscount: {
            dollarAmount: element.quickDiscount?.dollarAmount || 0,
            percentageAmount: element.quickDiscount?.percentageAmount || 0,
            isActive: element.quickDiscount?.isActive || false,
          },
          manufacturerSku: element.manufacturerSku || "",
          internalSku: element.internalSku || "",
          additionalProductDetails: element.additionalProductDetails || "",
        };
      })
    );

    await Product.insertMany(updatedRes);
    res.status(200).send({
      message: "Product Added successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShowingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "show" }).sort({ _id: -1 });
    res.send(products);
    // console.log("products", products);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  const {
    title,
    category,
    price,
    page,
    limit,
    search,
    sort_by,
    sort_dir,
    status, // Phase 3: Status filter (all, published, drafts)
    product_type, // Phase 3: Product type filter (simple, variable)
    stock_status, // Phase 3: Stock status filter (in_stock, out_of_stock, on_backorder)
    brand, // Phase 3: Brand filter
  } = req.query;

  let queryObject = {};
  let sortObject = {};

  // Enhanced search: name, SKU, or description
  if (search || title) {
    const searchTerm = search || title;
    const titleQueries = languageCodes.map((lang) => ({
      [`title.${lang}`]: { $regex: `${searchTerm}`, $options: "i" },
    }));
    const descriptionQueries = languageCodes.map((lang) => ({
      [`description.${lang}`]: { $regex: `${searchTerm}`, $options: "i" },
    }));
    queryObject.$or = [
      ...titleQueries,
      ...descriptionQueries,
      { sku: { $regex: `${searchTerm}`, $options: "i" } },
      { manufacturerSku: { $regex: `${searchTerm}`, $options: "i" } },
      { internalSku: { $regex: `${searchTerm}`, $options: "i" } },
    ];
  }

  // Handle new sort_by and sort_dir parameters (Phase 2)
  // Priority: sort_by/sort_dir > price parameter
  if (sort_by && sort_dir) {
    const sortDirection = sort_dir === "asc" ? 1 : -1;
    switch (sort_by) {
      case "name":
        // Sort by title in default language (en) or first available language
        sortObject = { "title.en": sortDirection };
        break;
      case "sku":
        sortObject = { sku: sortDirection };
        break;
      case "price":
        // Use originalPrice for consistency with old price filter behavior
        sortObject = { "prices.originalPrice": sortDirection };
        break;
      case "date":
        sortObject = { updatedAt: sortDirection };
        break;
      case "stock":
        sortObject = { stock: sortDirection };
        break;
      case "brand":
        sortObject = { "brand.name": sortDirection };
        break;
      default:
        sortObject = { updatedAt: -1 }; // Default: Date descending
    }
  } else if (price === "low") {
    sortObject = {
      "prices.originalPrice": 1,
    };
  } else if (price === "high") {
    sortObject = {
      "prices.originalPrice": -1,
    };
  } else if (price === "published") {
    queryObject.status = "show";
  } else if (price === "unPublished") {
    queryObject.status = "hide";
  } else if (price === "status-selling") {
    queryObject.stock = { $gt: 0 };
  } else if (price === "status-out-of-stock") {
    queryObject.stock = { $lt: 1 };
  } else if (price === "date-added-asc") {
    sortObject.createdAt = 1;
  } else if (price === "date-added-desc") {
    sortObject.createdAt = -1;
  } else if (price === "date-updated-asc") {
    sortObject.updatedAt = 1;
  } else if (price === "date-updated-desc") {
    sortObject.updatedAt = -1;
  } else {
    // Default sort: Date (descending) per requirements
    sortObject = { updatedAt: -1 };
  }

  // Phase 3: Status filter (All, Published, Drafts)
  if (status && status !== "all") {
    if (status === "published") {
      queryObject.status = "show";
    } else if (status === "drafts") {
      queryObject.status = "hide";
    }
  }

  // Phase 3: Product Type filter (Simple, Variable)
  if (product_type) {
    if (product_type === "simple") {
      // Simple products: not a combination
      queryObject.isCombination = false;
    } else if (product_type === "variable") {
      // Variable products: is a combination
      queryObject.isCombination = true;
    }
  }

  // Phase 3: Stock Status filter (In stock, Out of stock, On backorder)
  if (stock_status) {
    if (stock_status === "in_stock") {
      queryObject.stock = { $gt: 0 };
    } else if (stock_status === "out_of_stock") {
      queryObject.$or = [{ stock: { $exists: false } }, { stock: { $lte: 0 } }];
    } else if (stock_status === "on_backorder") {
      queryObject.stock = { $lt: 0 }; // Negative stock indicates backorder
    }
  }

  // Phase 3: Brand filter
  if (brand) {
    queryObject.brand = brand;
  }

  // console.log('sortObject', sortObject);

  if (category) {
    queryObject.categories = category;
  }

  const pages = Number(page);
  const limits = Number(limit);
  const skip = (pages - 1) * limits;

  try {
    const totalDoc = await Product.countDocuments(queryObject);

    const products = await Product.find(queryObject)
      .populate({ path: "category", select: "_id name" })
      .populate({ path: "categories", select: "_id name" })
      .populate({ path: "brand", select: "_id name slug" })
      .sort(sortObject)
      .skip(skip)
      .limit(limits);

    res.send({
      products,
      totalDoc,
      limits,
      pages,
    });
  } catch (err) {
    // console.log("error", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductBySlug = async (req, res) => {
  // console.log("slug", req.params.slug);
  try {
    const product = await Product.aggregate([
      {
        $match: {
          slug: req.params.slug, // Match product by slug
        },
      },
      {
        $lookup: {
          from: "reviews", // The reviews collection
          localField: "_id", // Product's _id
          foreignField: "product", // Review's product field
          as: "reviews", // Add reviews to the result as a 'reviews' array
        },
      },
      {
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews", // Filter reviews array
              as: "review",
              cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
            },
          },
        },
      },
    ]);

    res.status(200).send(product.length > 0 ? product[0] : []);
  } catch (err) {
    res.status(500).send({
      message: `Slug problem, ${err.message}`,
    });
  }
};
const getProductByid = async (req, res) => {
  // console.log("slug", req.params.slug);
  try {
    const product = await Product.findOne({ _id: req.params.id });
    res.status(200).send(product);
  } catch (err) {
    res.status(500).send({
      message: `id problem, ${err.message}`,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({ path: "category", select: "_id, name" })
      .populate({ path: "categories", select: "_id name" });

    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getSiteProducts = async (req, res) => {
  try {
    // Extract query parameters
    const {
      price,
      discount,
      rating,
      category,
      tag,
      slug,
      page = 1,
      sort = "name_asc",
      limit = 16,
      isFeatured,
      status,
    } = req.query;

    // Parse filters
    const priceRange = price ? price.split("-").map(Number) : null;
    const pageNumber = parseInt(page, 10);
    const ratingValues = rating ? rating.split(",").map(Number) : null;

    const limitNumber = parseInt(limit, 10);

    // Build the filter query
    const filters = {
      status: "show",
    };

    if (priceRange) {
      filters["prices.price"] = { $gte: priceRange[0], $lte: priceRange[1] };
    }

    if (discount && discount === "yes") {
      filters["prices.discount"] = { $gt: 0 };
    } else if (discount === "no") {
      filters["prices.discount"] = { $lte: 0 };
    }

    console.log(category);
    // Handle category filter
    if (category) {
      const categoryFromDb = await Category.findOne({
        "name.en": { $regex: new RegExp(category.split("-").join(" "), "i") },
      });
      if (categoryFromDb) {
        // Get the category id
        filters.categories = categoryFromDb._id;

        // Get child categories if this category is a parent
        const childCategories = await Category.find({
          parentId: categoryFromDb._id,
        }).select("_id");
        const childCategoryIds = childCategories.map((cat) => cat._id);

        // Add child category IDs to the filter if they exist
        if (childCategoryIds.length > 0) {
          filters.categories = {
            $in: [categoryFromDb._id, ...childCategoryIds],
          };
        }
      }
    }

    if (tag) {
      filters.tag = { $in: tag.split(",") }; // Support multiple tags
    }

    if (slug) {
      filters.slug = slug;
    }

    if (isFeatured !== undefined) {
      filters.isFeatured = isFeatured === "true";
    }

    if (status) {
      filters.status = status;
    }

    // Build rating filter using aggregation pipeline
    let ratingFilter = {};
    if (ratingValues) {
      // Fetch product IDs with matching review ratings
      const reviewMatches = await Review.aggregate([
        { $match: { rating: { $in: ratingValues } } },
        { $group: { _id: "$product" } }, // Group by product ID
      ]);
      const matchingProductIds = reviewMatches.map((match) => match._id);
      ratingFilter._id = { $in: matchingProductIds };
    }

    // Combine filters
    Object.assign(filters, ratingFilter);

    // Define sort logic
    const sortOptions = {};
    if (sort === "name_asc") {
      sortOptions["title.en"] = 1; // Assuming `title` is localized
    } else if (sort === "name_desc") {
      sortOptions["title.en"] = -1;
    } else if (sort === "price_asc") {
      sortOptions["prices.price"] = 1;
    } else if (sort === "price_desc") {
      sortOptions["prices.price"] = -1;
    } else if (sort === "sales_desc") {
      sortOptions.sales = -1; // Sort by sales
    } else if (sort === "rating_desc") {
      sortOptions["reviews.rating"] = -1; // Assuming reviews have a `rating` field
    }
    // Fetch products with pagination and sorting

    // const products = await Product.find(filters)
    //   .sort(sortOptions)
    //   .skip((pageNumber - 1) * limitNumber)
    //   .limit(limitNumber)
    //   .populate({
    //     path: 'reviews', // This is the reference in the Product model
    //     populate: {
    //       path: 'product', // This is the reference in the Review model (link to Product)
    //       select: 'title', // Optionally select the fields you want from the Product model
    //     },
    //     select: 'rating comment name email createdAt', // Select the fields you need from the Review model
    //   });
    // .populate('categories', 'name') // Populate categories with their names
    // .populate('reviews', 'rating'); // Populate reviews with their ratings
    const products = await Product.aggregate([
      { $match: filters }, // Apply filters to the products
      { $sort: sortOptions }, // Sort by title or price
      { $skip: (pageNumber - 1) * limitNumber }, // Pagination
      { $limit: limitNumber }, // Limit to the number of products per page
      {
        $lookup: {
          from: "reviews", // Review collection name
          localField: "_id", // Product's _id
          foreignField: "product", // Review's product field
          as: "reviews", // The resulting reviews array
        },
      },
      {
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews", // Filter reviews array
              as: "review",
              cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
            },
          },
        },
      },
    ]);
    // Fetch total count for pagination
    const totalProducts = await Product.countDocuments(filters);

    res.status(200).send({
      data: products,
      pagination: {
        total: totalProducts,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalProducts / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    // Extract query parameters for optional filtering and limiting
    const limit = parseInt(req.query.limit, 10) || 10;

    // Fetch featured products
    // const featuredProducts = await Product.find({ isFeatured: true })
    //   .limit(limit)
    // .populate({ path: "category", select: "_id name" })
    // .populate({ path: "categories", select: "_id name" });

    const featuredProducts = await Product.aggregate([
      {
        $match: {
          isFeatured: true,
        },
      }, // Apply filters to the products
      { $limit: limit }, // Limit to the number of products per page
      {
        $lookup: {
          from: "reviews", // Review collection name
          localField: "_id", // Product's _id
          foreignField: "product", // Review's product field
          as: "reviews", // The resulting reviews array
        },
      },
      {
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews", // Filter reviews array
              as: "review",
              cond: { $eq: ["$$review.status", "approved"] }, // Only approved reviews
            },
          },
        },
      },
    ]);
    // Respond with the featured products
    res.status(200).send(featuredProducts);
  } catch (err) {
    console.error("Error fetching featured products:", err);
    res.status(500).send({
      message: "Failed to fetch featured products.",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    // console.log("product", product);

    if (product) {
      product.title = { ...product.title, ...req.body.title };
      product.description = {
        ...product.description,
        ...req.body.description,
      };
      product.metaTitle = req.body.metaTitle;
      product.metaDescription = req.body.metaDescription;
      product.metaKeywords = req.body.metaKeywords;
      product.weight = req.body.weight;
      product.height = req.body.height;
      product["length"] = req.body["length"];
      product.width = req.body.width;
      product.excerpt = req.body.excerpt;
      product.productId = req.body.productId;
      product.sku = req.body.sku;
      product.barcode = req.body.barcode;
      product.slug = req.body.slug;
      product.categories = req.body.categories;
      product.category = req.body.category;
      product.show = req.body.show;
      product.isCombination = req.body.isCombination;
      product.variants = req.body.variants;
      product.stock = req.body.stock;
      // Update prices object explicitly
      product.prices.price =
        req.body.prices?.price ?? req.body.price ?? product.prices.price;
      product.prices.originalPrice =
        req.body.prices?.originalPrice ??
        req.body.originalPrice ??
        product.prices.originalPrice;
      product.prices.tradePrice =
        req.body.prices?.tradePrice ??
        req.body.tradePrice ??
        product.prices.tradePrice;
      product.prices.discount =
        req.body.prices?.discount ??
        req.body.discount ??
        product.prices.discount;

      // Update profit margin object explicitly
      product.profitMargin.dollarDifference =
        req.body.profitMargin?.dollarDifference ??
        product.profitMargin.dollarDifference;
      product.profitMargin.percentageDifference =
        req.body.profitMargin?.percentageDifference ??
        product.profitMargin.percentageDifference;

      // Update quick discount object explicitly with proper handling
      product.quickDiscount.dollarAmount =
        req.body.quickDiscount?.dollarAmount ?? 0;
      product.quickDiscount.percentageAmount =
        req.body.quickDiscount?.percentageAmount ?? 0;
      product.quickDiscount.isActive =
        req.body.quickDiscount?.isActive ?? false;
      product.image = req.body.image;

      // Fix tags: handle stringified JSON or array - use recursive parser
      // Allow tags to be removed by setting to empty array
      const parseTags = (tagData) => {
        if (tagData === null || tagData === undefined || tagData === "")
          return [];

        if (Array.isArray(tagData)) {
          return tagData.filter(
            (tag) => tag && typeof tag === "string" && tag.trim()
          );
        }

        if (typeof tagData === "string") {
          let current = tagData;
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            try {
              const parsed = JSON.parse(current);

              if (Array.isArray(parsed)) {
                return parsed.filter(
                  (tag) => tag && typeof tag === "string" && tag.trim()
                );
              }

              if (typeof parsed === "string") {
                current = parsed;
                attempts++;
                continue;
              }

              return [parsed].filter(
                (tag) => tag && typeof tag === "string" && tag.trim()
              );
            } catch (e) {
              if (
                current.trim() &&
                !current.startsWith("[") &&
                !current.startsWith('"')
              ) {
                return [current.trim()];
              }
              return [];
            }
          }

          return [];
        }

        return [];
      };

      // Always parse tags - allows removal by sending empty array or null
      if (req.body.tag !== undefined) {
        product.tag = parseTags(req.body.tag);
      }

      // marginType and discountType are deprecated - don't update them at all
      // They will keep their existing values or remain undefined
      // This prevents validation errors when these fields are not in the request body
      product.manufacturerSku = req.body.manufacturerSku;
      product.internalSku = req.body.internalSku;
      product.additionalProductDetails = req.body.additionalProductDetails;
      product.lastBatchOrderedFromManufacturer =
        req.body.lastBatchOrderedFromManufacturer;
      product.lastBatchOrderQuantity = req.body.lastBatchOrderQuantity;
      product.lastBatchOrderReference = req.body.lastBatchOrderReference;
      product.stockArrivalDate = req.body.stockArrivalDate;
      product.vehicleMake = req.body.vehicleMake;
      product.vehicleModel = req.body.vehicleModel;
      product.flatRateForDropShipping = req.body.flatRateForDropShipping;
      product.shipOutLocation = req.body.shipOutLocation;
      product.directSupplierLink = req.body.directSupplierLink;

      // Phase 6: Log changes before saving
      const oldProduct = await Product.findById(req.params.id).lean();
      const changes = {};

      // Compare and track changes
      Object.keys(req.body).forEach((key) => {
        if (JSON.stringify(oldProduct[key]) !== JSON.stringify(req.body[key])) {
          changes[key] = {
            old: oldProduct[key],
            new: req.body[key],
          };
        }
      });

      await product.save();

      // Log the changes
      if (Object.keys(changes).length > 0) {
        await logProductChange(
          product._id,
          req.user?._id,
          req.user?.name,
          "update",
          changes,
          req
        );
      }

      res.send({ data: product, message: "Product updated successfully!" });
    } else {
      res.status(404).send({
        message: "Product Not Found!",
      });
    }
  } catch (err) {
    res.status(404).send(err.message);
    // console.log('err',err)
  }
};

const updateManyProducts = async (req, res) => {
  try {
    const updatedData = {};
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] !== "[]" &&
        Object.entries(req.body[key]).length > 0 &&
        req.body[key] !== req.body.ids &&
        key !== "ids" // Exclude 'ids' from being set as a field
      ) {
        // Special handling for 'tag' field - use recursive parser
        if (key === "tag") {
          const parseTags = (tagData) => {
            if (!tagData) return [];

            if (Array.isArray(tagData)) {
              return tagData.filter(
                (tag) => tag && typeof tag === "string" && tag.trim()
              );
            }

            if (typeof tagData === "string") {
              let current = tagData;
              let attempts = 0;
              const maxAttempts = 10;

              while (attempts < maxAttempts) {
                try {
                  const parsed = JSON.parse(current);

                  if (Array.isArray(parsed)) {
                    return parsed.filter(
                      (tag) => tag && typeof tag === "string" && tag.trim()
                    );
                  }

                  if (typeof parsed === "string") {
                    current = parsed;
                    attempts++;
                    continue;
                  }

                  return [parsed].filter(
                    (tag) => tag && typeof tag === "string" && tag.trim()
                  );
                } catch (e) {
                  if (
                    current.trim() &&
                    !current.startsWith("[") &&
                    !current.startsWith('"')
                  ) {
                    return [current.trim()];
                  }
                  return [];
                }
              }

              return [];
            }

            return [];
          };

          updatedData[key] = parseTags(req.body[key]);
        } else if (key === "marginType" || key === "discountType") {
          // Only set if valid enum value
          if (
            req.body[key] &&
            ["percentage", "fixed"].includes(req.body[key])
          ) {
            updatedData[key] = req.body[key];
          }
        } else {
          updatedData[key] = req.body[key];
        }
      }
    }

    // Handle specific fields like 'isFeatured' and 'stock'
    if (req.body.isFeatured !== undefined) {
      updatedData.isFeatured = req.body.isFeatured;
    }
    if (req.body.stock !== undefined) {
      updatedData.stock = req.body.stock;
    }
    if (req.body.status !== undefined) {
      updatedData.status = req.body.status;
    }
    if (req.body.categories !== undefined) {
      updatedData.categories = req.body.categories;
    }
    if (req.body.category !== undefined) {
      updatedData.category = req.body.category;
    }

    // console.log("updated data", updatedData);

    await Product.updateMany(
      { _id: { $in: req.body.ids } },
      {
        $set: updatedData,
      },
      {
        multi: true,
      }
    );

    // Phase 6: Log bulk update
    if (req.body.ids && req.body.ids.length > 0) {
      for (const productId of req.body.ids) {
        await logProductChange(
          productId,
          req.user?._id,
          req.user?.name,
          "bulk_update",
          updatedData,
          req
        );
      }
    }

    res.send({
      message: "Products update successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStatus = (req, res) => {
  const newStatus = req.body.status;
  Product.updateOne(
    { _id: req.params.id },
    {
      $set: {
        status: newStatus,
      },
    },
    (err) => {
      if (err) {
        res.status(500).send({
          message: err.message,
        });
      } else {
        res.status(200).send({
          message: `Product ${newStatus} Successfully!`,
        });
      }
    }
  );
};

const deleteProduct = (req, res) => {
  Product.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "Product Deleted Successfully!",
      });
    }
  });
};

const getShowingStoreProducts = async (req, res) => {
  // console.log("req.body", req);
  try {
    const queryObject = { status: "show" };

    const { category, title, slug } = req.query;
    // console.log("title", title);

    // console.log("query", req);

    if (category) {
      queryObject.categories = {
        $in: [category],
      };
    }

    if (title) {
      const titleQueries = languageCodes.map((lang) => ({
        [`title.${lang}`]: { $regex: `${title}`, $options: "i" },
      }));

      queryObject.$or = titleQueries;
    }
    if (slug) {
      queryObject.slug = { $regex: slug, $options: "i" };
    }

    let products = [];
    let popularProducts = [];
    let discountedProducts = [];
    let relatedProducts = [];

    if (slug) {
      products = await Product.find(queryObject)
        .populate({ path: "category", select: "name _id" })
        .sort({ _id: -1 })
        .limit(100);
      relatedProducts = await Product.find({
        category: products[0]?.category,
      }).populate({ path: "category", select: "_id name" });
    } else if (title || category) {
      products = await Product.find(queryObject)
        .populate({ path: "category", select: "name _id" })
        .sort({ _id: -1 })
        .limit(100);
    } else {
      popularProducts = await Product.find({ status: "show" })
        .populate({ path: "category", select: "name _id" })
        .sort({ sales: -1 })
        .limit(20);

      discountedProducts = await Product.find({
        status: "show", // Ensure status "show" for discounted products
        $or: [
          {
            $and: [
              { isCombination: true },
              {
                variants: {
                  $elemMatch: {
                    discount: { $gt: "0.00" },
                  },
                },
              },
            ],
          },
          {
            $and: [
              { isCombination: false },
              {
                $expr: {
                  $gt: [
                    { $toDouble: "$prices.discount" }, // Convert the discount field to a double
                    0,
                  ],
                },
              },
            ],
          },
        ],
      })
        .populate({ path: "category", select: "name _id" })
        .sort({ _id: -1 })
        .limit(20);
    }

    res.send({
      products,
      popularProducts,
      relatedProducts,
      discountedProducts,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Phase 3: Get status counts for tabs (All, Published, Drafts)
const getProductStatusCounts = async (req, res) => {
  try {
    const allCount = await Product.countDocuments({});
    const publishedCount = await Product.countDocuments({ status: "show" });
    const draftsCount = await Product.countDocuments({ status: "hide" });

    res.send({
      all: allCount,
      published: publishedCount,
      drafts: draftsCount,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Phase 6: Export products to CSV with filters
const exportProductsToCSV = async (req, res) => {
  try {
    const {
      search,
      status,
      category,
      product_type,
      stock_status,
      brand,
      sort_by,
      sort_dir,
    } = req.query;

    let queryObject = {};
    let sortObject = { updatedAt: -1 };

    // Apply same filters as getAllProducts
    if (search) {
      const titleQueries = languageCodes.map((lang) => ({
        [`title.${lang}`]: { $regex: `${search}`, $options: "i" },
      }));
      const descriptionQueries = languageCodes.map((lang) => ({
        [`description.${lang}`]: { $regex: `${search}`, $options: "i" },
      }));
      queryObject.$or = [
        ...titleQueries,
        ...descriptionQueries,
        { sku: { $regex: `${search}`, $options: "i" } },
        { manufacturerSku: { $regex: `${search}`, $options: "i" } },
        { internalSku: { $regex: `${search}`, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      if (status === "published") {
        queryObject.status = "show";
      } else if (status === "drafts") {
        queryObject.status = "hide";
      }
    }

    if (product_type) {
      if (product_type === "simple") {
        queryObject.isCombination = false;
      } else if (product_type === "variable") {
        queryObject.isCombination = true;
      }
    }

    if (stock_status) {
      if (stock_status === "in_stock") {
        queryObject.stock = { $gt: 0 };
      } else if (stock_status === "out_of_stock") {
        queryObject.$or = [
          { stock: { $exists: false } },
          { stock: { $lte: 0 } },
        ];
      } else if (stock_status === "on_backorder") {
        queryObject.stock = { $lt: 0 };
      }
    }

    if (brand) {
      queryObject.brand = brand;
    }

    if (category) {
      queryObject.categories = category;
    }

    // Apply sorting
    if (sort_by && sort_dir) {
      const sortDirection = sort_dir === "asc" ? 1 : -1;
      switch (sort_by) {
        case "name":
          sortObject = { "title.en": sortDirection };
          break;
        case "sku":
          sortObject = { sku: sortDirection };
          break;
        case "price":
          sortObject = { "prices.price": sortDirection };
          break;
        case "date":
          sortObject = { updatedAt: sortDirection };
          break;
        case "stock":
          sortObject = { stock: sortDirection };
          break;
        case "brand":
          sortObject = { "brand.name": sortDirection };
          break;
      }
    }

    // Get all products matching filters (no pagination for export)
    const products = await Product.find(queryObject)
      .populate({ path: "category", select: "_id name" })
      .populate({ path: "categories", select: "_id name" })
      .populate({ path: "brand", select: "_id name slug" })
      .sort(sortObject);

    // Format data for CSV
    const csvData = products.map((product) => {
      const categories = product.categories || [];
      const categoryNames =
        categories.length > 0
          ? categories
              .map((cat) => cat?.name?.en || cat?.name || "")
              .join(" | ")
          : product?.category?.name?.en || product?.category?.name || "";

      // Parse tags safely - handle multiple levels of stringification
      const parseTags = (tagData) => {
        if (!tagData) return [];

        if (Array.isArray(tagData)) {
          return tagData.filter(
            (tag) => tag && typeof tag === "string" && tag.trim()
          );
        }

        if (typeof tagData === "string") {
          let current = tagData;
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            try {
              const parsed = JSON.parse(current);

              if (Array.isArray(parsed)) {
                return parsed.filter(
                  (tag) => tag && typeof tag === "string" && tag.trim()
                );
              }

              if (typeof parsed === "string") {
                current = parsed;
                attempts++;
                continue;
              }

              return [parsed].filter(
                (tag) => tag && typeof tag === "string" && tag.trim()
              );
            } catch (e) {
              if (
                current.trim() &&
                !current.startsWith("[") &&
                !current.startsWith('"')
              ) {
                return [current.trim()];
              }
              return [];
            }
          }

          return [];
        }

        return [];
      };

      const tags = parseTags(product.tag);
      const tagNames = tags.join(" | ");

      return {
        ID: product._id,
        Name: product.title?.en || product.title || "",
        SKU: product.sku || "",
        Status: product.status === "show" ? "Published" : "Draft",
        Stock: product.stock || 0,
        Price: product.prices?.price || product.prices?.originalPrice || 0,
        Categories: categoryNames,
        Tags: tagNames,
        Brand: product.brand?.name || "",
        Featured: product.isFeatured ? "Yes" : "No",
        "Date Modified": product.updatedAt
          ? new Date(product.updatedAt).toISOString().split("T")[0]
          : "",
      };
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=products_export_${new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "")}_${Date.now()}.csv`
    );

    // Convert to CSV
    if (csvData.length === 0) {
      return res.send(
        "ID,Name,SKU,Status,Stock,Price,Categories,Tags,Brand,Featured,Date Modified\n"
      );
    }

    const headers = Object.keys(csvData[0]).join(",");
    const rows = csvData.map((row) =>
      Object.values(row)
        .map((val) => {
          // Escape commas and quotes in CSV
          const str = String(val || "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    );

    res.send([headers, ...rows].join("\n"));
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyProducts = async (req, res) => {
  try {
    const cname = req.cname;
    // console.log("deleteMany", cname, req.body.ids);

    await Product.deleteMany({ _id: req.body.ids });

    res.send({
      message: `Products Delete Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  getShowingStoreProducts,
  getFeaturedProducts,
  getNewArrivals,
  bestSellerProduct,
  topRatedProduct,
  specialOfferProduct,
  getSiteProducts,
  getProductByid,
  getSearchResult,
  getProductStatusCounts, // Phase 3: Status counts for tabs
  duplicateProduct, // Phase 4: Duplicate product
  exportProductsToCSV, // Phase 6: Export to CSV
};
