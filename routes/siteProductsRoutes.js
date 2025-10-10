const express = require('express');
const router = express.Router();
const productsController = require('../controller/productController');

router.get('/', productsController.getSiteProducts);
router.get('/search', productsController.getSearchResult)
router.get('/featured', productsController.getFeaturedProducts);
router.get("/new-arrival", productsController.getNewArrivals);
router.get("/special-offer", productsController.specialOfferProduct);
router.get("/top-rated", productsController.topRatedProduct);
router.get("/best-seller", productsController.bestSellerProduct);
router.get("/get-by-id/:id", productsController.getProductByid);
router.get("/:slug", productsController.getProductBySlug);


module.exports = router;