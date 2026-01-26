const mongoose = require('mongoose');

const buildProductSchema = new mongoose.Schema(
  {
    build_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Build',
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    linked_at: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['manual', 'order_history'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate product links per build
buildProductSchema.index({ build_id: 1, product_id: 1 }, { unique: true });
buildProductSchema.index({ build_id: 1 });
buildProductSchema.index({ product_id: 1 });

const BuildProduct = mongoose.model('BuildProduct', buildProductSchema);

module.exports = BuildProduct;

