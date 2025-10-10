const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
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
});


const Address = mongoose.model("address", addressSchema);

module.exports = Address;
