const { upload, getPublicUrl, deleteFile } = require("../utils/uploadHelper");
const path = require("path");
const fs = require("fs");

/**
 * Single image upload
 * POST /api/upload/image
 */
const uploadSingleImage = async (req, res) => {
  try {
    const uploadSingle = upload.single("image");

    uploadSingle(req, res, (err) => {
      if (err) {
        return res.status(400).send({
          message: err.message || "File upload failed",
        });
      }

      if (!req.file) {
        return res.status(400).send({
          message: "No file uploaded",
        });
      }

      const publicUrl = getPublicUrl(req.file.path, req);

      res.send({
        message: "Image uploaded successfully",
        url: publicUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Multiple images upload
 * POST /api/upload/images
 */
const uploadMultipleImages = async (req, res) => {
  try {
    const uploadMultiple = upload.array("images", 10); // Max 10 images

    uploadMultiple(req, res, (err) => {
      if (err) {
        return res.status(400).send({
          message: err.message || "File upload failed",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).send({
          message: "No files uploaded",
        });
      }

      const uploadedFiles = req.files.map((file) => ({
        url: getPublicUrl(file.path, req),
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.send({
        message: `${req.files.length} image(s) uploaded successfully`,
        files: uploadedFiles,
        count: req.files.length,
      });
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Delete image
 * DELETE /api/upload/image
 */
const deleteImage = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).send({
        message: "Image URL is required",
      });
    }

    const deleted = deleteFile(url);

    if (deleted) {
      res.send({
        message: "Image deleted successfully",
      });
    } else {
      res.status(404).send({
        message: "Image not found or could not be deleted",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Get list of uploaded images (optional - for admin panel)
 * GET /api/upload/images
 */
const getUploadedImages = async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    const images = [];

    if (!fs.existsSync(uploadsDir)) {
      return res.send({
        images: [],
        count: 0,
      });
    }

    const scanDirectory = (dir, basePath = "") => {
      const items = fs.readdirSync(dir);

      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, path.join(basePath, item));
        } else {
          const ext = path.extname(item).toLowerCase();
          if (
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)
          ) {
            const relativePath = path.join(basePath, item).replace(/\\/g, "/");
            images.push({
              url: `/uploads/${relativePath}`,
              filename: item,
              path: relativePath,
              size: stat.size,
              modified: stat.mtime,
            });
          }
        }
      });
    };

    scanDirectory(uploadsDir);

    // Sort by modified date (newest first)
    images.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.send({
      images,
      count: images.length,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
  getUploadedImages,
};
