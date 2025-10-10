// controllers/brandController.js
const Brand = require('../models/Brands');

// Create a new brand
exports.createBrand = async (req, res) => {
    try {
        const brand = new Brand(req.body);
        await brand.save();
        res.status(201).json(brand);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all brands
exports.getBrands = async (req, res) => {
    try {
        const brands = await Brand.find({});
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSiteBrands = async (req, res) => {
    try {
        const { limit } = req.query; // Extract limit from query params

        // Aggregation to fetch brands with product counts
        const pipeline = [
            { $match: { isPublished: 'show' } }, // Filter only published brands
            {
                $lookup: {
                    from: 'products', // Name of the products collection
                    localField: '_id', // Brand ID in the Brand collection
                    foreignField: 'brand', // Associated brand field in Product collection
                    as: 'products',
                },
            },
            {
                $addFields: {
                    productCount: { $size: '$products' }, // Count products for each brand
                },
            },
            {
                $project: {
                    products: 0, // Exclude product details from the result
                },
            },
        ];

        // Apply limit if provided
        if (limit) {
            pipeline.push({ $limit: parseInt(limit, 10) });
        }

        const brands = await Brand.aggregate(pipeline);
        res.status(200).json(brands);
    } catch (error) {
        console.error('Error fetching brands with product counts:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get a single brand by ID
exports.getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        res.status(200).json(brand);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a brand
exports.updateBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        res.status(200).json(brand);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a brand
exports.deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndDelete(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        res.status(200).json({ message: 'Brand deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
