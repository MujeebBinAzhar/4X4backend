const axios = require("axios");
const Product = require("../models/Product");

const getAustraliaPostageOptions = async (req, res) => {
        try {
                const { cartProducts, postcode } = req.body;

                if (!cartProducts || !Array.isArray(cartProducts) || cartProducts.length === 0) {
                        return res.status(400).send({ message: "Invalid cartProducts in request body." });
                }

                if (!postcode) {
                        return res.status(400).send({ message: "Postcode is required." });
                }

                // Fetch product details for all cart products
                const products = await Product.find({ _id: { $in: cartProducts } });
                if (!products || products.length === 0) {
                        return res.status(404).send({ message: "No products found for the provided IDs." });
                }

                let cumulativePrices = null;

                for (const product of products) {
                        const { length, width, height, weight } = product;

                        // Validate product dimensions
                        if (!length || !width || !height || !weight) {
                                return res.status(400).send({
                                        message: `Missing dimensions for product: ${product._id}`,
                                });
                        }

                        // Hit Australia Post API for each product
                        const response = await axios.get(
                                "https://digitalapi.auspost.com.au/postage/parcel/domestic/service.json",
                                {
                                        params: {
                                                from_postcode: 4650, // You can customize this value if needed
                                                to_postcode: postcode,
                                                length,
                                                width,
                                                height,
                                                weight: weight > 22 ? 22 : weight,
                                        },
                                        headers: {
                                                "AUTH-KEY": process.env.AUS_POST_AUTH_KEY,
                                        },
                                }
                        );


                        // Process API response and calculate cumulative prices
                        if (response.data && response.data.services && response.data.services.service) {
                                for (const service of response.data.services.service) {
                                        const { code, price } = service;

                                        if (!cumulativePrices) {
                                                cumulativePrices = response.data; // Clone the structure
                                                // // Initialize all prices to 0 for each service
                                                cumulativePrices.services.service.forEach((srv) => {
                                                        srv.price = 0;
                                                });
                                        }
                                        // Add the current product's price to the cumulative price of the service
                                        const targetService = cumulativePrices.services.service.find(
                                                (srv) => srv.code === code
                                        );

                                        if (targetService) {
                                                targetService.price = (
                                                        parseFloat(targetService.price) + parseFloat(price)
                                                ).toFixed(2); // Keep the price in 2 decimal places
                                        }
                                }
                        }
                }


                // Send cumulative price response
                res.status(200).send(cumulativePrices);
        } catch (error) {
                console.log(error)
                console.error("Error fetching postage options:", error.message);
                res.status(500).send({ message: "Error fetching postage options." });
        }
};



module.exports = {
        // Other controller functions
        getAustraliaPostageOptions,
};
