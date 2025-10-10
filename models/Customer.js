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
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
