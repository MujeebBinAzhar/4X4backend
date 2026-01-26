const OrderStatusHistory = require("../models/OrderStatusHistory");
const Order = require("../models/Order");

/**
 * Middleware to automatically log order status changes
 * This middleware should be used after order update operations
 * It checks if the status has changed and logs it to OrderStatusHistory
 */
const logOrderStatusChange = async (req, res, next) => {
  try {
    // Only proceed if this is a status update
    if (req.body.status && req.params.id) {
      const orderId = req.params.id;
      const newStatus = req.body.status;
      const adminId = req.user?._id;

      // Get current order status
      const currentOrder = await Order.findById(orderId);
      if (currentOrder && currentOrder.status !== newStatus && adminId) {
        // Status has changed, log it
        await OrderStatusHistory.create({
          orderId: orderId,
          oldStatus: currentOrder.status,
          newStatus: newStatus,
          changedBy: adminId,
          reason: req.body.reason || "",
        });
      }
    }
    next();
  } catch (err) {
    // Don't block the request if logging fails
    console.error("Error logging order status change:", err.message);
    next();
  }
};

/**
 * Post-update middleware to log status changes after order update
 * This is called after the order has been updated
 */
const logOrderStatusChangePost = async (req, res) => {
  try {
    // This is a post-response hook - we'll handle it differently
    // The actual logging is done in the controller for better control
    // This middleware can be used for additional logging if needed
  } catch (err) {
    console.error("Error in post-update status logging:", err.message);
  }
};

module.exports = {
  logOrderStatusChange,
  logOrderStatusChangePost,
};

