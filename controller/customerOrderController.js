require("dotenv").config();
const stripe = require("stripe");
const Razorpay = require("razorpay");
// const stripe = require("stripe")(`${process.env.STRIPE_KEY}` || null); /// use hardcoded key if env not work

const mongoose = require("mongoose");

const Order = require("../models/Order");
const Setting = require("../models/Setting");

const { handleProductQuantity } = require("../lib/stock-controller/others");
const { formatAmountForStripe } = require("../lib/stripe/stripe");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { orderRecieved, paymentReceived } = require("./emailController");

const addOrder = async (req, res) => {
  // console.log("addOrder", req.body);
  try {
    const newOrder = new Order({
      ...req.body,
      user: req.user._id,
    });
    const order = await newOrder.save();
    res.status(201).send(order);
    handleProductQuantity(order.cart);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

async function addOrderToDb(orderData, userId, shipToDifferentAddress,
  billingAddress,
  shippingAddress, deliveryMethod) {
  try {

    let customerId = userId;
    if (!customerId || customerId === "") {
      const { email } = billingAddress;

      // Find an existing customer by billing email
      let customer = await Customer.findOne({ email });

      if (!customer) {
        const shippAddress = shipToDifferentAddress ? shippingAddress : billingAddress
        // Create a new customer if none exists
        customer = new Customer({
          name: `${orderData.billingAddress.firstName} ${orderData.billingAddress.lastName}`,
          email,
          phone: orderData.billingAddress.phone,
          country: orderData.billingAddress.country,
          city: orderData.billingAddress.city,
          address: `${orderData.billingAddress.address1}, ${orderData.billingAddress.address2}`,
          shippingAddresses: [
            {
              ...shippAddress,
              default: true, // Mark the billing address as the default shipping address
            },
          ],
        });

        customer = await customer.save();
      }

      // Use the found or newly created customer's ID
      customerId = customer._id;
    }
    // Fetch product details from the database based on productId
    const items = await Promise.all(
      orderData.map(async (item) => {
        const product = await Product.findById(item.product.id);

        if (!product) {
          throw new Error(`Product with ID ${item.product.id} not found`);
        }

        return {
          productId: product._id,
          name: item.product.name,
          description: item.product.description,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        };
      })
    );

    // Calculate subTotal, shippingCost, and total
    const subTotal = items.reduce((acc, item) => acc + item.total, 0);
    const shippingCost = parseInt(deliveryMethod?.endPrice) * orderData?.length; // Fixed shipping cost (can be dynamic)
    const discount = 0; // Default discount
    const total = subTotal + shippingCost - discount;

    // Prepare the order object
    const order = new Order({
      user: customerId,
      cart: items,
      user_info: {
        name: `${billingAddress.firstName} ${billingAddress.lastName}`,
        email: billingAddress.email,
        contact: billingAddress.phone,
        address: shipToDifferentAddress ? `${shippingAddress.address1}, ${shippingAddress.address2}` : `${billingAddress.address1}, ${billingAddress.address2}`,
        city: shipToDifferentAddress ? shippingAddress.city : billingAddress.city,
        country: shipToDifferentAddress ? shippingAddress.country : billingAddress.country,
        zipCode: shipToDifferentAddress ? shippingAddress.postcode : billingAddress.postcode,
      },
      subTotal,
      shippingCost,
      discount,
      total,
      orderId:Math.random().toString(36).substring(2, 8).toUpperCase(),
      shippingMethod: deliveryMethod?.method,
      shippingServiceOption: deliveryMethod?.serviceOption,
      shippingOption: deliveryMethod?.serviceName, // Default or fetched dynamically
      paymentMethod: 'Stripe',
      status: "Payment-Processing", // Initial status
    });

    // Save the order to the database
    const savedOrder = await order.save();
     handleProductQuantity(order.cart);
    orderRecieved(order.user_info?.email,`${billingAddress.firstName} ${billingAddress.lastName}`,items,shippingCost,total)

    return savedOrder;
  } catch (error) {
    console.error("Error adding order:", error.message);
    throw new Error("Could not create the order");
  }
}

const createCheckoutSession = async (req, res) => {
  const storeSetting = await Setting.findOne({ name: "storeSetting" });
  const stripeSecret = storeSetting?.setting?.stripe_secret;
  const stripeInstance = stripe(stripeSecret);

  try {
    const { items, successUrl, cancelUrl, userId, shipToDifferentAddress, billingAddress, shippingAddress, deliverMethod, shipping } = req.body;
    const order = await addOrderToDb(items, userId, shipToDifferentAddress,
      billingAddress,
      shippingAddress, deliverMethod)
    // Map items to Stripe line items
    const lineItems = items.map((item) => (
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product.name,
            description: item.product.description, // Add a description
            images: item.product.images, // Add an array of image URLs
            metadata: {
              // category: item.product.category, // Custom metadata
              sku: item.product.sku, // Add SKU or any other detail
            },

          },

          unit_amount: (Math.round(item.total) * 100), // Convert dollars to cents
        },
        quantity: item.quantity,
      }));

    // // Create a Stripe Checkout session
    // const session = await stripeInstance.checkout.sessions.create({
    //   payment_method_types: ['card'], // Accept card payments
    //   line_items: lineItems,

    //   shipping_address_collection: {
    //     allowed_countries: ['AU'],
    //   },
    //   shipping_options: [
    //     {
    //       shipping_rate_data: {
    //         type: 'fixed_amount',
    //         fixed_amount: {
    //           amount: Math.round(shipping) * 100,
    //           currency: 'usd',
    //         },
    //         display_name: 'shipping Cost',
    //         delivery_estimate: {
    //           minimum: {
    //             unit: 'business_day',
    //             value: 5,
    //           },
    //           maximum: {
    //             unit: 'business_day',
    //             value: 10,
    //           },
    //         },
    //       },
    //     },
    //   ],
    //   mode: 'payment', // One-time payment
    //   success_url: `${successUrl}/${order._id}?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: cancelUrl,
    // });

    res.status(200).json({ url: order });
  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

//create payment intent for stripe
const createPaymentIntent = async (req, res) => {
  const { total: amount, cardInfo: payment_intent, email } = req.body;
  // console.log("req.body", amount);
  // Validate the amount that was passed from the client.
  // if (!(amount >= process.env.MIN_AMOUNT && amount <= process.env.MAX_AMOUNT)) {
  //   return res.status(500).json({ message: "Invalid amount." });
  // }
  const storeSetting = await Setting.findOne({ name: "storeSetting" });
  const stripeSecret = storeSetting?.setting?.stripe_secret;
  const stripeInstance = stripe(stripeSecret);
  if (payment_intent.id) {
    try {
      const current_intent = await stripeInstance.paymentIntents.retrieve(
        payment_intent.id
      );
      // If PaymentIntent has been created, just update the amount.
      if (current_intent) {
        const updated_intent = await stripeInstance.paymentIntents.update(
          payment_intent.id,
          {
            amount: formatAmountForStripe(amount, "usd"),
          }
        );
        // console.log("updated_intent", updated_intent);
        return res.send(updated_intent);
      }
    } catch (err) {
      if (err.code !== "resource_missing") {
        const errorMessage =
          err instanceof Error ? err.message : "Internal server error";
        return res.status(500).send({ message: errorMessage });
      }
    }
  }
  try {
    // Create PaymentIntent from body params.
    const params = {
      amount: formatAmountForStripe(amount, "usd"),
      currency: "usd",
      description: process.env.STRIPE_PAYMENT_DESCRIPTION || "",
      automatic_payment_methods: {
        enabled: true,
      },
    };
    const payment_intent = await stripeInstance.paymentIntents.create(params);
    // console.log("payment_intent", payment_intent);

    res.send(payment_intent);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).send({ message: errorMessage });
  }
};

const createOrderByRazorPay = async (req, res) => {
  try {
    const storeSetting = await Setting.findOne({ name: "storeSetting" });
    // console.log("createOrderByRazorPay", storeSetting?.setting);

    const instance = new Razorpay({
      key_id: storeSetting?.setting?.razorpay_id,
      key_secret: storeSetting?.setting?.razorpay_secret,
    });

    const options = {
      amount: req.body.amount * 100,
      currency: "INR",
    };
    const order = await instance.orders.create(options);

    if (!order)
      return res.status(500).send({
        message: "Error occurred when creating order!",
      });
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const addRazorpayOrder = async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
      user: req.user._id,
    });
    const order = await newOrder.save();
    res.status(201).send(order);
    handleProductQuantity(order.cart);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get all orders user
const getOrderCustomer = async (req, res) => {
  try {
    // console.log("getOrderCustomer");
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments({ user: req.user._id });

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // today order amount

    // query for orders
    const orders = await Order.find({ user: req.user._id })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      limits,
      pages,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderByOrderId = async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.id,
    });
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const trackOrder = async (req, res) => {
  try {
    const queryData=req.query;
    console.log(queryData);
    const order = await Order.findOne({
      orderId: queryData.orderNumber,
      'user_info.email': queryData.email,
    });
    if(!order) {
      res.status(404).send({
        message: "Order not found",
      });
    }else{
    res.send(order);

    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const updateOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the order by ID
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    // Update the order status
    order.status = 'Pending';

    await order.save();

    paymentReceived(order?.user_info?.email,order?.user_info?.name,order?.orderId,order?.total,'Stripe',order?.cart,order?.shippingCost,order?.total)

    res.send({
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getCustomerOrdersByEmail = (req,res) => {
  const { email } = req.params;
  Order.find({ "user_info.email": email }).sort({ createdAt: -1 })
    .then((orders) => {
      res.send(orders);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message,
      });
    }); 
}

module.exports = {
  addOrder,
  trackOrder,
  updateOrderById,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  createOrderByRazorPay,
  addRazorpayOrder,
  createCheckoutSession,
  getCustomerOrdersByEmail,
  getOrderByOrderId
};
