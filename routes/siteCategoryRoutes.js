const express = require('express');
const router = express.Router();
const {
        addCategory,
        addAllCategory,
        getAllCategory,
        getAllCategories,
        getShowingCategory,
        getCategoryById,
        updateCategory,
        updateStatus,
        deleteCategory,
        deleteManyCategory,
        updateManyCategory,
        getCategoriesForSite,
        getCategoryBySlug
} = require('../controller/categoryController');


//get only showing category
router.get('/', getShowingCategory);
router.get('/:slug', getCategoryBySlug);




module.exports = router;
