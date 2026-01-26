const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
    // CBSG (Customer Build & Social Garage) fields
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    buildId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Build",
      required: false,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: false,
    },
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    type: {
      type: String,
      required: false,
      enum: [
        'user_approved',
        'user_rejected',
        'build_approved',
        'build_rejected',
        'build_liked',
        'build_commented',
        'comment_reply',
        'user_mentioned',
        'user_followed',
        'content_flagged',
        'build_disabled',
        'user_disabled',
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["read", "unread"],
      default: "unread",
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
