const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    marginType: {
      type: String,
      required: false,
      default: undefined,
      // Removed enum constraint to allow undefined/null values without validation errors
      // Validation can be done at application level if needed
    },
    discountType: {
      type: String,
      required: false,
      default: undefined,
      // Removed enum constraint to allow undefined/null values without validation errors
      // Validation can be done at application level if needed
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
        required: false,
      },
      tradePrice: {
        type: Number,
        required: false,
      },
      price: {
        type: Number,
        required: false,
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

// Pre-save hook to ensure marginType and discountType are never required
productSchema.pre('save', function(next) {
  // If marginType or discountType are empty strings, null, or undefined, set them to undefined
  if (this.marginType === '' || this.marginType === null) {
    this.marginType = undefined;
  }
  if (this.discountType === '' || this.discountType === null) {
    this.discountType = undefined;
  }
  next();
});

// Pre-validate hook to skip validation for deprecated fields
productSchema.pre('validate', function(next) {
  // Skip validation for marginType and discountType if they're undefined
  if (this.marginType === undefined) {
    this.$locals.skipMarginTypeValidation = true;
  }
  if (this.discountType === undefined) {
    this.$locals.skipDiscountTypeValidation = true;
  }
  next();
});

// module.exports = productSchema;

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
