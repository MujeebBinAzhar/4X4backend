const mongoose = require("mongoose");

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    oldStatus: {
      type: String,
      required: false,
    },
    newStatus: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    reason: {
      type: String,
      required: false,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
orderStatusHistorySchema.index({ orderId: 1, changedAt: -1 });

const OrderStatusHistory = mongoose.model(
  "OrderStatusHistory",
  orderStatusHistorySchema
);

module.exports = OrderStatusHistory;

