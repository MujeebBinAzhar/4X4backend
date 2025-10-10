const mongoose = require("mongoose");

const guestPostSchema = new mongoose.Schema(
  {
    title: {
      type: Object,
      required: true,
    },
    userId:{
        type:String,
        required:true,
        ref:'Customer'
    },
    description: {
      type: Object,
      required: true,
    },
    images: [
      {
        type: String,
        required: false,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const GuestPost = mongoose.model("guest-post", guestPostSchema);

module.exports = GuestPost;
