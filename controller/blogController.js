
const Blog = require("../models/Blog");
const mongoose = require("mongoose");
const slugify = require("slugify");




// Add a new blog post
const addBlog = async (req, res) => {
  try {
    if (!req.body.slug) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    }else{
    req.body.slug = slugify(req.body.slug, { lower: true, strict: true });

    }
    const newBlog = new Blog(req.body);
    await newBlog.save();
    res.send({ message: "Blog Added Successfully!" });
  } catch (err) {
    res.status(500).send({ message: `Error adding blog: ${err.message}` });
  }
};

// Get all blogs for Admin (including drafts) with pagination
const getAllBlogsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pages = Number(page);
    const limits = Number(limit);
    const skip = (pages - 1) * limits;
    const totalDoc = await Blog.countDocuments();
    const blogs = await Blog.find()
      .skip(skip)
      .limit(limits);
    res.send({ blogs, totalDoc, limits, pages });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get all published blogs for Website with pagination
const getAllBlogsWebsite = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pages = Number(page);
    const limits = Number(limit);
    const skip = (pages - 1) * limits;
    const totalDoc = await Blog.countDocuments({ status: "Published" });
    const blogs = await Blog.find({ status: "Published" })
      .skip(skip)
      .limit(limits);
    res.send({ blogs, totalDoc, limits, pages });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get blogs by specific user
const getBlogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blogs = await Blog.find({ creator: userId });
    res.send(blogs);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get blog by ID or slug
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }] });
    if (!blog) return res.status(404).send({ message: "Blog not found" });
    res.send(blog);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
const getBlogBySlug = async (req, res) => {
  try {
    console.log()
    const blog = await Blog.findOne( { slug: req.params.slug });
    if (!blog) return res.status(204).send({ message: "Blog not found" });
    res.send(blog);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Update blog post
const updateBlog = async (req, res) => {
  try {
    if (req.body.title && !req.body.slug) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    }else{
    req.body.slug = slugify(req.body.slug, { lower: true, strict: true });

    }
    await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.send({ message: "Blog updated successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Delete blog post
const deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.send({ message: "Blog deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  addBlog,
  getAllBlogsAdmin,
  getAllBlogsWebsite,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogsByUser,
  getBlogBySlug
};
