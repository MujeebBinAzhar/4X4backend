const Order = require("../models/Order");
const OrderStatusHistory = require("../models/OrderStatusHistory");

/**
 * Get status counts for header tabs
 * Returns counts for All, Completed, and Refunded orders
 */
const getStatusCounts = async (includeTrashed = false) => {
  try {
    const queryObject = {};
    if (!includeTrashed) {
      queryObject.isTrashed = false;
    }

    const allCount = await Order.countDocuments(queryObject);
    const completedCount = await Order.countDocuments({
      ...queryObject,
      status: "Completed",
    });
    const refundedCount = await Order.countDocuments({
      ...queryObject,
      status: "Refunded",
    });

    return {
      all: allCount,
      completed: completedCount,
      refunded: refundedCount,
    };
  } catch (err) {
    console.error("Error getting status counts:", err.message);
    return {
      all: 0,
      completed: 0,
      refunded: 0,
    };
  }
};

/**
 * Get detailed status counts for all statuses
 */
const getAllStatusCounts = async (includeTrashed = false) => {
  try {
    const queryObject = {};
    if (!includeTrashed) {
      queryObject.isTrashed = false;
    }

    const statuses = [
      "Payment-Processing",
      "Pending",
      "Processing",
      "Awaiting Stock",
      "On-Hold",
      "Picking/Packing",
      "Awaiting Delivery",
      "Out-for-Delivery",
      "Delivered",
      "Completed",
      "Cancel",
      "Cancelled",
      "Refunded",
    ];

    const counts = {};
    for (const status of statuses) {
      counts[status] = await Order.countDocuments({
        ...queryObject,
        status: status,
      });
    }

    return counts;
  } catch (err) {
    console.error("Error getting all status counts:", err.message);
    return {};
  }
};

/**
 * Format order for export
 * Converts order object to a flat structure suitable for CSV export
 */
const formatOrderForExport = (order) => {
  const customerName = order.user_info?.name || order.user?.name || "";
  const customerEmail = order.user_info?.email || order.user?.email || "";

  return {
    "Order ID": order.orderId || "",
    Invoice: order.invoice || "",
    "Customer Name": customerName,
    "Customer Email": customerEmail,
    "Order Date": order.createdAt
      ? new Date(order.createdAt).toLocaleDateString()
      : "",
    "Order Time": order.createdAt
      ? new Date(order.createdAt).toLocaleTimeString()
      : "",
    Status: order.status || "",
    "Payment Method": order.paymentMethod || "",
    "Sub Total": order.subTotal || 0,
    Discount: order.discount || 0,
    "Shipping Cost": order.shippingCost || 0,
    Total: order.total || 0,
    "Shipment Tracking": order.shipmentTracking || "",
    Origin: order.origin || "",
    Address: order.user_info?.address || "",
    City: order.user_info?.city || "",
    Country: order.user_info?.country || "",
    "Zip Code": order.user_info?.zipCode || "",
    Contact: order.user_info?.contact || "",
  };
};

/**
 * Validate status transition
 * Checks if a status change is valid (optional business logic)
 */
const validateStatusTransition = (oldStatus, newStatus) => {
  // Define valid status transitions (optional - can be customized)
  const validTransitions = {
    "Payment-Processing": [
      "Pending",
      "Processing",
      "Cancelled",
      "On-Hold",
    ],
    Pending: [
      "Processing",
      "Awaiting Stock",
      "On-Hold",
      "Cancelled",
    ],
    Processing: [
      "Awaiting Stock",
      "On-Hold",
      "Picking/Packing",
      "Cancelled",
    ],
    "Awaiting Stock": [
      "Processing",
      "Picking/Packing",
      "On-Hold",
      "Cancelled",
    ],
    "On-Hold": [
      "Processing",
      "Awaiting Stock",
      "Picking/Packing",
      "Cancelled",
    ],
    "Picking/Packing": [
      "Awaiting Delivery",
      "On-Hold",
      "Cancelled",
    ],
    "Awaiting Delivery": [
      "Out-for-Delivery",
      "On-Hold",
      "Cancelled",
    ],
    "Out-for-Delivery": [
      "Delivered",
      "Completed",
      "On-Hold",
    ],
    Delivered: ["Completed", "Refunded"],
    Completed: ["Refunded"], // Can only refund completed orders
    Cancel: ["Cancelled"], // Legacy status
    Cancelled: [], // Terminal status
    Refunded: [], // Terminal status
  };

  // If old status not in map, allow transition (for backward compatibility)
  if (!validTransitions[oldStatus]) {
    return { valid: true, message: "Status transition allowed" };
  }

  // Check if transition is valid
  const allowedStatuses = validTransitions[oldStatus];
  if (allowedStatuses.includes(newStatus)) {
    return { valid: true, message: "Status transition allowed" };
  }

  // Special case: Admin can always set to any status (override)
  // This validation is optional and can be bypassed
  return {
    valid: true, // Set to true to allow any transition (can be changed to false for strict validation)
    message: `Warning: Unusual status transition from ${oldStatus} to ${newStatus}`,
  };
};

/**
 * Get order status history with formatted data
 */
const getOrderStatusHistory = async (orderId) => {
  try {
    const history = await OrderStatusHistory.find({ orderId })
      .populate("changedBy", "name email")
      .sort({ changedAt: -1 });

    return history.map((entry) => ({
      id: entry._id,
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt,
      reason: entry.reason,
      createdAt: entry.createdAt,
    }));
  } catch (err) {
    console.error("Error getting order status history:", err.message);
    return [];
  }
};

/**
 * Get status badge color (for frontend use)
 */
const getStatusBadgeColor = (status) => {
  const colorMap = {
    "Payment-Processing": "blue",
    Pending: "yellow",
    Processing: "blue",
    "Awaiting Stock": "orange",
    "On-Hold": "yellow",
    "Picking/Packing": "purple",
    "Awaiting Delivery": "teal",
    "Out-for-Delivery": "indigo",
    Delivered: "green",
    Completed: "green",
    Cancel: "red",
    Cancelled: "red",
    Refunded: "gray",
  };

  return colorMap[status] || "gray";
};

/**
 * Get status display name (formatted)
 */
const getStatusDisplayName = (status) => {
  const displayMap = {
    "Payment-Processing": "Payment Processing",
    Pending: "Pending",
    Processing: "Processing",
    "Awaiting Stock": "Awaiting Stock",
    "On-Hold": "On Hold",
    "Picking/Packing": "Picking/Packing",
    "Awaiting Delivery": "Awaiting Delivery",
    "Out-for-Delivery": "Out for Delivery",
    Delivered: "Delivered",
    Completed: "Completed",
    Cancel: "Cancelled",
    Cancelled: "Cancelled",
    Refunded: "Refunded",
  };

  return displayMap[status] || status;
};

module.exports = {
  getStatusCounts,
  getAllStatusCounts,
  formatOrderForExport,
  validateStatusTransition,
  getOrderStatusHistory,
  getStatusBadgeColor,
  getStatusDisplayName,
};

