const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    marginType: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    discountType: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    manufacturerSku: {
      type: String,
      required: false,
    },
    internalSku: {
      type: String,
      required: false,
    },
    additionalProductDetails: {
      type: String,
      required: false,
    },

    lastBatchOrderedFromManufacturer: {
      type: Date,
      required: false,
    },
    lastBatchOrderQuantity: {
      type: Number,
      required: false,
    },
    lastBatchOrderReference: {
      type: String,
      required: false,
    },
    stockArrivalDate: {
      type: Date,
      required: false,
    },
    vehicleMake: {
      type: String,
      required: false,
    },
    vehicleModel: {
      type: String,
      required: false,
    },
    flatRateForDropShipping: {
      type: Number,
      required: false,
    },
    shipOutLocation: {
      type: String,
      required: false,
    },
    directSupplierLink: {
      type: String,
      required: false,
    },
    productId: {
      type: String,
      required: false,
    },
    sku: {
      type: String,
      required: false,
    },
    barcode: {
      type: String,
      required: false,
    },
    title: {
      type: Object,
      required: true,
    },
    description: {
      type: Object,
      required: false,
    },
    slug: {
      type: String,
      required: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: false,
      },
    ],

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    image: {
      type: Array,
      required: false,
    },
    stock: {
      type: Number,
      required: false,
    },

    sales: {
      type: Number,
      required: false,
    },

    tag: [String],
    prices: {
      originalPrice: {
        type: Number,
        required: true,
      },
      tradePrice: {
        type: Number,
        required: false,
      },
      price: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        required: false,
      },
    },
    profitMargin: {
      dollarDifference: {
        type: Number,
        required: false,
      },
      percentageDifference: {
        type: Number,
        required: false,
      },
    },
    quickDiscount: {
      dollarAmount: {
        type: Number,
        required: false,
      },
      percentageAmount: {
        type: Number,
        required: false,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
    },
    variants: [{}],
    isCombination: {
      type: Boolean,
      required: true,
    },

    status: {
      type: String,
      default: "show",
      enum: ["show", "hide"],
    },
    isFeatured: {
      type: Boolean,
      default: true,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review", // Reference to the Review model
        required: false,
      },
    ],
    excerpt: {
      type: String,
      required: false,
    },
    weight: {
      type: String,
      required: false,
    },
    length: {
      type: String,
      required: false,
    },
    width: {
      type: String,
      required: false,
    },
    height: {
      type: String,
      required: false,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: false,
    },
    metaTitle: {
      type: String,
      required: false,
    },
    metaDescription: {
      type: String,
      required: false,
    },
    metaKeywords: {
      type: Array,
      required: false,
    },
  },

  {
    timestamps: true,
  }
);

// module.exports = productSchema;

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
