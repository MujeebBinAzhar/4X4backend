const mongoose = require("mongoose");
const slugify = require("slugify");

// Blog Model
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  metaTitle: { type: String },
  metaDescription: { type: String },
  metaKeywords: [{ type: String }],
  blogImage: { type: String },
  status: { type: String, enum: ["Published", "Draft"], default: "Draft" }
}, { timestamps: true });

blogSchema.pre("validate", function(next) {
  if (!this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;