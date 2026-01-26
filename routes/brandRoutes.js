const express = require('express');
const router = express.Router();
const {
  getAllBrands,
  createBrand,
  getBrandById,
  updateBrand,
  deleteBrand,
  getBrandProducts,
  getSiteBrands,
  // Contact management functions
  getBrandContacts,
  addBrandContact,
  updateBrandContact,
  deleteBrandContact,
} = require('../controller/brandController');

// Admin routes
router.get('/', getAllBrands); // GET /api/brands (with search, filter, pagination)
router.post('/', createBrand); // POST /api/brands (create new brand)
router.get('/:id', getBrandById); // GET /api/brands/:id (get brand by ID)
router.patch('/:id', updateBrand); // PATCH /api/brands/:id (update brand)
router.put('/:id', updateBrand); // PUT /api/brands/:id (update brand - backward compatibility)
router.delete('/:id', deleteBrand); // DELETE /api/brands/:id (delete brand if no products)

// Get products for a brand
router.get('/:id/products', getBrandProducts); // GET /api/brand/:id/products

// Contact management routes
router.get('/:id/contacts', getBrandContacts); // GET /api/brand/:id/contacts (get all contacts)
router.post('/:id/contacts', addBrandContact); // POST /api/brand/:id/contacts (add new contact)
router.patch('/:id/contacts/:contactId', updateBrandContact); // PATCH /api/brand/:id/contacts/:contactId (update contact)
router.put('/:id/contacts/:contactId', updateBrandContact); // PUT /api/brand/:id/contacts/:contactId (update contact - backward compatibility)
router.delete('/:id/contacts/:contactId', deleteBrandContact); // DELETE /api/brand/:id/contacts/:contactId (delete contact)

// Public/site routes (keep for backward compatibility)
router.get('/site/list', getSiteBrands); // GET /api/brand/site/list

module.exports = router;