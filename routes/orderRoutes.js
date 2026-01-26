const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  deleteOrder,
  bulkUpdateOrders,
  addOrderNote,
  exportOrders,
  bestSellerProductChart,
  getDashboardOrders,
  getDashboardRecentOrder,
  getDashboardCount,
  getDashboardAmount,
} = require("../controller/orderController");
const { isAuth, isAdmin } = require("../config/auth");

// Dashboard routes (no auth required for backward compatibility - can be added later)
router.get("/dashboard", getDashboardOrders);
router.get("/dashboard-recent-order", getDashboardRecentOrder);
router.get("/dashboard-count", getDashboardCount);
router.get("/dashboard-amount", getDashboardAmount);
router.get("/best-seller/chart", bestSellerProductChart);

// OMS Routes - Admin only
// Get all orders with filters (enhanced)
router.get("/", isAuth, isAdmin, getAllOrders);

// Export orders to CSV
router.get("/export", isAuth, isAdmin, exportOrders);

// Get order by customer ID
router.get("/customer/:id", isAuth, isAdmin, getOrderCustomer);

// Get single order by ID (enhanced with status history)
router.get("/:id", isAuth, isAdmin, getOrderById);

// Update order (enhanced with status history logging)
router.put("/:id", isAuth, isAdmin, updateOrder);
router.patch("/:id", isAuth, isAdmin, updateOrder); // Support PATCH as well

// Bulk update orders
router.post("/bulk", isAuth, isAdmin, bulkUpdateOrders);

// Add note to order
router.post("/:id/notes", isAuth, isAdmin, addOrderNote);

// Delete order (soft delete - move to trash)
router.delete("/:id", isAuth, isAdmin, deleteOrder);

module.exports = router;
