const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    shippingProtection: {
      type: Boolean,
      required: false,
    },
    orderId:{
      type: String,
      required: false,
    },
    invoice: {
      type: Number,
      required: false,
    },
    cart: [{}],
    user_info: {
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      contact: {
        type: String,
        required: false,
      },
      address: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      country: {
        type: String,
        required: false,
      },
      zipCode: {
        type: String,
        required: false,
      },
    },
    subTotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
    },
    shippingOption: {
      type: String,
      required: false,
    },
    shippingMethod: {
      type: String,
      required: false,
    },
    shippingServiceOption: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    cardInfo: {
      type: Object,
      required: false,
    },
    status: {
      type: String,
      enum: [
        "Payment-Processing",
        "Pending",
        "Processing",
        "Awaiting Stock",
        "On-Hold",
        "Picking/Packing",
        "Awaiting Delivery",
        "Out-for-Delivery",
        "Delivered",
        "Completed",
        "Cancel",
        "Cancelled",
        "Refunded",
      ],
    },
    shipmentTracking: {
      type: String,
      required: false,
    },
    origin: {
      type: String,
      required: false,
      default: "Website",
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    staffNotes: [
      {
        note: {
          type: String,
          required: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema.plugin(AutoIncrement, {
    inc_field: "invoice",
    start_seq: 10000,
  })
);
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generates a random 6-character ID
  }
  next();
});


module.exports = Order;
