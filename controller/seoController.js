// Import Express and Model
const SeoMeta = require('../models/SeoMeta');

// Create or Update SEO Meta Data
exports.createOrUpdateSeoMeta = async (req, res) => {
        try {
                const { page, metaTitle, metaDescription, metaKeywords } = req.body;

                let seoMeta = await SeoMeta.findOne({ page });

                if (seoMeta) {
                        // Update existing metadata
                        seoMeta.metaTitle = metaTitle;
                        seoMeta.metaDescription = metaDescription;
                        seoMeta.metaKeywords = metaKeywords;
                        await seoMeta.save();
                        return res.status(200).json({ message: 'SEO metadata updated successfully.', seoMeta, status: 200 });
                } else {
                        // Create new metadata
                        seoMeta = new SeoMeta({ page, metaTitle, metaDescription, metaKeywords });
                        await seoMeta.save();
                        return res.status(201).json({ message: 'SEO metadata created successfully.', seoMeta, status: 201 });
                }
        } catch (error) {
                res.status(500).json({ message: 'Internal server error', error });
        }
};

// Get All SEO Meta Data
exports.getAllSeoMeta = async (req, res) => {
        try {
                const seoMetaList = await SeoMeta.find();
                res.status(200).json(seoMetaList);
        } catch (error) {
                res.status(500).json({ message: 'Internal server error', error });
        }
};

// Get SEO Meta Data by Page
exports.getSeoMetaByPage = async (req, res) => {
        try {
                const { page } = req.params;
                const seoMeta = await SeoMeta.findOne({ page });

                if (!seoMeta) {
                        return res.status(201).json({ message: 'SEO metadata not found for this page.', data: {} });
                }

                res.status(200).json({
                        message: "Seo metadata found",
                        data: seoMeta
                });
        } catch (error) {
                res.status(500).json({ message: 'Internal server error', error });
        }
};

// Delete SEO Meta Data by Page
exports.deleteSeoMetaByPage = async (req, res) => {
        try {
                const { page } = req.params;

                const seoMeta = await SeoMeta.findOneAndDelete({ page });

                if (!seoMeta) {
                        return res.status(404).json({ message: 'SEO metadata not found for this page.' });
                }

                res.status(200).json({ message: 'SEO metadata deleted successfully.' });
        } catch (error) {
                res.status(500).json({ message: 'Internal server error', error });
        }
};