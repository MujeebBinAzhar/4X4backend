const express = require("express");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  updateOrderById,
  createPaymentIntent,
  addRazorpayOrder,
  createOrderByRazorPay,
  createCheckoutSession,
  getCustomerOrdersByEmail,
  getOrderByOrderId,trackOrder
} = require("../controller/customerOrderController");

//add a order
router.post("/add", addOrder);
router.post("/create-checkout-session", createCheckoutSession)

router.get("/orders-by-email/:email",getCustomerOrdersByEmail);
// create stripe payment intent
router.post("/create-payment-intent", createPaymentIntent);

//add razorpay order
router.post("/add/razorpay", addRazorpayOrder);

//add a order by razorpay
router.post("/create/razorpay", createOrderByRazorPay);
router.get("/track-order", trackOrder);
router.get("/order-by-orderId/:id", getOrderByOrderId);
//get a order by id
router.get("/:id", getOrderById);
router.post("/:id", updateOrderById);

//get all order by a user
router.get("/", getOrderCustomer);


module.exports = router;
