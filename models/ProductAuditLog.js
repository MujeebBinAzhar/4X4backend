const mongoose = require("mongoose");

const productAuditLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
    userName: {
      type: String,
      required: false,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete", "duplicate", "bulk_update"],
      required: true,
    },
    field: {
      type: String,
      required: false, // Field name that was changed
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    changes: {
      type: Object, // Store all changes in one object
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
productAuditLogSchema.index({ productId: 1, createdAt: -1 });
productAuditLogSchema.index({ userId: 1, createdAt: -1 });

const ProductAuditLog = mongoose.model("ProductAuditLog", productAuditLogSchema);

module.exports = ProductAuditLog;

