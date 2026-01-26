// controllers/brandController.js
const Brand = require('../models/Brands');
const BrandContact = require('../models/BrandContact');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get all brands with search, filter, pagination, and product count
const getAllBrands = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      is_active,
      sort_by = 'name',
      sort_dir = 'asc'
    } = req.query;

    // Build query object
    const queryObject = {};

    // Search by name
    if (search) {
      queryObject.name = { $regex: search, $options: 'i' };
    }

    // Filter by is_active
    if (is_active !== undefined && is_active !== '') {
      queryObject.is_active = is_active === 'true' || is_active === true;
    }

    // Build sort object
    const sortObject = {};
    const sortDirection = sort_dir === 'desc' ? -1 : 1;
    switch (sort_by) {
      case 'name':
        sortObject.name = sortDirection;
        break;
      case 'created':
        sortObject.createdAt = sortDirection;
        break;
      case 'updated':
        sortObject.updatedAt = sortDirection;
        break;
      default:
        sortObject.name = 1;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalDoc = await Brand.countDocuments(queryObject);

    // Get brands with product count using aggregation
    const brands = await Brand.aggregate([
      { $match: queryObject },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'brand',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      {
        $project: {
          products: 0 // Exclude product details
        }
      },
      { $sort: sortObject },
      { $skip: skip },
      { $limit: limitNum }
    ]);

    res.status(200).json({
      brands,
      totalDoc,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalDoc / limitNum)
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message || 'Error fetching brands' 
    });
  }
};

// Create a new brand
const createBrand = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name) {
      return res.status(400).json({ 
        message: 'Brand name is required' 
      });
    }

    // Check if brand name already exists
    const existingBrand = await Brand.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } 
    });
    
    if (existingBrand) {
      return res.status(400).json({ 
        message: 'Brand name already exists' 
      });
    }

    // Handle logo_url (can be from image field for backward compatibility)
    const brandData = {
      ...req.body,
      logo_url: req.body.logo_url || req.body.image || '',
      image: req.body.logo_url || req.body.image || '', // Keep for backward compatibility
    };

    const brand = new Brand(brandData);
    await brand.save();

    // Get product count for response
    const productCount = await Product.countDocuments({ brand: brand._id });

    res.status(201).json({
      ...brand.toObject(),
      productCount
    });
    } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (unique constraint)
      return res.status(400).json({ 
        message: 'Brand name or slug already exists' 
      });
    }
    res.status(400).json({ 
      message: error.message || 'Error creating brand' 
    });
  }
};

// Get site brands (public-facing, only active brands)
const getSiteBrands = async (req, res) => {
  try {
    const { limit } = req.query;

    // Aggregation to fetch active brands with product counts
        const pipeline = [
      { 
        $match: { 
          $or: [
            { is_active: true },
            { isPublished: 'show' } // Backward compatibility
          ]
        } 
      },
            {
                $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'brand',
                    as: 'products',
                },
            },
            {
                $addFields: {
          productCount: { $size: '$products' },
                },
            },
            {
                $project: {
          products: 0,
                },
            },
      { $sort: { name: 1 } }
        ];

        if (limit) {
            pipeline.push({ $limit: parseInt(limit, 10) });
        }

        const brands = await Brand.aggregate(pipeline);
        res.status(200).json(brands);
    } catch (error) {
    console.error('Error fetching site brands:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching brands' 
    });
  }
};

// Get a single brand by ID with product count and contacts
const getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Get product count
    const productCount = await Product.countDocuments({ brand: brand._id });

    // Get contacts
    const contacts = await BrandContact.find({ brand_id: brand._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      ...brand.toObject(),
      productCount,
      contacts: contacts || []
    });
    } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    res.status(500).json({ 
      message: error.message || 'Error fetching brand' 
    });
    }
};

// Update a brand
const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check if name is being updated and if it's unique
    if (req.body.name && req.body.name !== brand.name) {
      const existingBrand = await Brand.findOne({ 
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: brand._id }
      });
      
      if (existingBrand) {
        return res.status(400).json({ 
          message: 'Brand name already exists' 
        });
      }
    }

    // Handle logo_url update
    const updateData = { ...req.body };
    if (req.body.logo_url) {
      updateData.logo_url = req.body.logo_url;
      updateData.image = req.body.logo_url; // Sync for backward compatibility
    } else if (req.body.image && !req.body.logo_url) {
      updateData.logo_url = req.body.image;
    }

    // Track if is_active is being changed (for Phase 7: visibility toggle)
    const wasActive = brand.is_active;
    const willBeActive = updateData.is_active !== undefined 
      ? updateData.is_active 
      : wasActive;

    // Update brand
    Object.assign(brand, updateData);
    await brand.save();

    // Phase 7: If visibility changed, update all linked products
    let affectedProductsCount = 0;
    if (wasActive !== willBeActive) {
      const updateResult = await Product.updateMany(
        { brand: brand._id },
        { is_visible: willBeActive }
      );
      affectedProductsCount = updateResult.modifiedCount || 0;
    }

    // Get updated product count
    const productCount = await Product.countDocuments({ brand: brand._id });

    res.status(200).json({
      ...brand.toObject(),
      productCount,
      affectedProductsCount // Number of products whose visibility was updated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Brand name or slug already exists' 
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    res.status(400).json({ 
      message: error.message || 'Error updating brand' 
    });
  }
};

// Delete a brand (only if no products linked)
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check if brand has products
    const productCount = await Product.countDocuments({ brand: brand._id });
    
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete brand. It has ${productCount} associated product(s). Please deactivate it instead.` 
      });
    }

    await Brand.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ 
      message: 'Brand deleted successfully' 
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    res.status(500).json({ 
      message: error.message || 'Error deleting brand' 
    });
  }
};

// Get all products for a brand
const getBrandProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const brandId = req.params.id;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get products
    const totalDoc = await Product.countDocuments({ brand: brandId });
    
    const products = await Product.find({ brand: brandId })
      .populate({ path: 'category', select: '_id name' })
      .populate({ path: 'categories', select: '_id name' })
      .select('_id title sku stock prices image status is_visible')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      products,
      totalDoc,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalDoc / limitNum)
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    res.status(500).json({ 
      message: error.message || 'Error fetching brand products' 
    });
  }
};

// ==================== CONTACT MANAGEMENT FUNCTIONS ====================

// Get all contacts for a brand
const getBrandContacts = async (req, res) => {
  try {
    const brandId = req.params.id;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Get contacts
    const contacts = await BrandContact.find({ brand_id: brandId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      contacts,
      count: contacts.length
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    res.status(500).json({ 
      message: error.message || 'Error fetching brand contacts' 
    });
  }
};

// Add a new contact to a brand
const addBrandContact = async (req, res) => {
  try {
    const brandId = req.params.id;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Validate required fields
    if (!req.body.contact_name) {
      return res.status(400).json({ 
        message: 'Contact name is required' 
      });
    }

    // Create contact
    const contactData = {
      brand_id: brandId,
      contact_name: req.body.contact_name,
      position_title: req.body.position_title || '',
      phone: req.body.phone || '',
      email: req.body.email || '',
      notes: req.body.notes || '',
    };

    const contact = new BrandContact(contactData);
    await contact.save();

    res.status(201).json({
      message: 'Contact added successfully',
      contact
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: error.message || 'Validation error' 
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    res.status(400).json({ 
      message: error.message || 'Error adding contact' 
    });
  }
};

// Update a contact
const updateBrandContact = async (req, res) => {
  try {
    const brandId = req.params.id;
    const contactId = req.params.contactId;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Verify contact exists and belongs to this brand
    const contact = await BrandContact.findOne({ 
      _id: contactId, 
      brand_id: brandId 
    });

    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found' 
      });
    }

    // Update contact fields
    if (req.body.contact_name !== undefined) {
      contact.contact_name = req.body.contact_name;
    }
    if (req.body.position_title !== undefined) {
      contact.position_title = req.body.position_title;
    }
    if (req.body.phone !== undefined) {
      contact.phone = req.body.phone;
    }
    if (req.body.email !== undefined) {
      contact.email = req.body.email;
    }
    if (req.body.notes !== undefined) {
      contact.notes = req.body.notes;
    }

    await contact.save();

    res.status(200).json({
      message: 'Contact updated successfully',
      contact
    });
    } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: error.message || 'Validation error' 
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid brand ID or contact ID' 
      });
    }
    res.status(400).json({ 
      message: error.message || 'Error updating contact' 
    });
  }
};

// Delete a contact
const deleteBrandContact = async (req, res) => {
  try {
    const brandId = req.params.id;
    const contactId = req.params.contactId;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Verify contact exists and belongs to this brand
    const contact = await BrandContact.findOne({ 
      _id: contactId, 
      brand_id: brandId 
    });

    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found' 
      });
    }

    await BrandContact.findByIdAndDelete(contactId);

    res.status(200).json({ 
      message: 'Contact deleted successfully' 
    });
    } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid brand ID or contact ID' 
      });
    }
    res.status(500).json({ 
      message: error.message || 'Error deleting contact' 
    });
  }
};

// Export all functions
module.exports = {
  getAllBrands,
  createBrand,
  getBrandById,
  updateBrand,
  deleteBrand,
  getBrandProducts,
  getSiteBrands, // Keep for backward compatibility
  // Contact management functions
  getBrandContacts,
  addBrandContact,
  updateBrandContact,
  deleteBrandContact,
};
