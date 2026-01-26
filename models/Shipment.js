const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    trackingNumber: {
      type: String,
      required: false,
    },
    carrier: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Label Created",
        "In Transit",
        "Out for Delivery",
        "Delivered",
        "Exception",
        "Returned",
      ],
      default: "Pending",
    },
    estimatedDelivery: {
      type: Date,
      required: false,
    },
    actualDelivery: {
      type: Date,
      required: false,
    },
    shippingAddress: {
      name: String,
      address: String,
      city: String,
      country: String,
      zipCode: String,
      contact: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ trackingNumber: 1 });

const Shipment = mongoose.model("Shipment", shipmentSchema);

module.exports = Shipment;

