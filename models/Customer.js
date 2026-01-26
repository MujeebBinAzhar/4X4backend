const mongoose = require("mongoose");
const Address = require("./Address");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    shippingAddresses: [
      {
        firstName: {
          type: String,
          required: true,
        },
        lastName: {
          type: String,
          required: true,
        },
        company: {
          type: String,
          required: false,
        },
        country: {
          type: String,
          required: true,
        },
        address1: {
          type: String,
          required: true,
        },
        address2: {
          type: String,
          required: false,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        postcode: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
        },
        phone: {
          type: String,
          required: true,
        },
        default: {
          type: Boolean,
          required: true,
        },

      }],
    // shippingAddress: {
    //   type: Object,
    //   required: false,

    //   // name: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // contact: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // email: {
    //   //   type: String,
    //   //   required: true,
    //   //   unique: true,
    //   //   lowercase: true,
    //   // },

    //   // address: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // country: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // city: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // area: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // zipCode: {
    //   //   type: String,
    //   //   required: true,
    //   // },
    //   // isDefault: {
    //   //   type: Boolean,
    //   //   required: true,
    //   // },
    // },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    // CBSG (Customer Build & Social Garage) fields
    handle: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          // 3-20 characters, alphanumeric + underscore only
          return /^[a-z0-9_]{3,20}$/.test(v);
        },
        message: 'Handle must be 3-20 characters, alphanumeric and underscores only'
      }
    },
    approved: {
      type: Boolean,
      default: false, // Requires admin approval
    },
    is_public: {
      type: Boolean,
      default: true, // Public profile by default
    },
    avatar_url: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      enum: ['google', 'meta', 'native'],
      default: 'native',
    },
    comment_permissions: {
      type: String,
      enum: ['everyone', 'followers', 'none'],
      default: 'everyone',
    },
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
