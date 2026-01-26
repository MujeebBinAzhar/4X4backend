const Order = require("../models/Order");
const OrderStatusHistory = require("../models/OrderStatusHistory");
const Shipment = require("../models/Shipment");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");
const { Parser } = require("json2csv");
const {
  getStatusCounts,
  formatOrderForExport,
  validateStatusTransition,
  getOrderStatusHistory,
} = require("../utils/orderHelpers");

const getAllOrders = async (req, res) => {
  const {
    day,
    status,
    page,
    limit,
    method,
    endDate,
    startDate,
    customerName,
    customer, // Filter by registered customer (email/name)
    origin, // Filter by referral channel
    search, // Global search (order ID, customer name, email)
    sortBy, // Sort field (date, total, orderId)
    sortOrder, // asc/desc
    includeTrashed, // Include trashed orders
  } = req.query;

  // Build query object
  const queryObject = {};

  // Exclude trashed orders by default
  if (!includeTrashed || includeTrashed === "false") {
    queryObject.isTrashed = false;
  }

  // Status filter
  if (status) {
    if (status === "All") {
      // Don't filter by status
    } else if (status === "Completed") {
      queryObject.status = "Completed";
    } else if (status === "Refunded") {
      queryObject.status = "Refunded";
    } else {
      queryObject.status = { $regex: `${status}`, $options: "i" };
    }
  }

  // Global search (order ID, customer name, email, invoice)
  if (search) {
    queryObject.$or = [
      { orderId: { $regex: `${search}`, $options: "i" } },
      { invoice: { $regex: `${search}`, $options: "i" } },
      { "user_info.name": { $regex: `${search}`, $options: "i" } },
      { "user_info.email": { $regex: `${search}`, $options: "i" } },
    ];
  }

  // Customer filter (for registered customers)
  if (customer) {
    queryObject.$or = [
      { "user_info.name": { $regex: `${customer}`, $options: "i" } },
      { "user_info.email": { $regex: `${customer}`, $options: "i" } },
    ];
  }

  // Legacy customerName filter (for backward compatibility)
  if (customerName && !customer) {
    queryObject.$or = [
      { "user_info.name": { $regex: `${customerName}`, $options: "i" } },
      { invoice: { $regex: `${customerName}`, $options: "i" } },
    ];
  }

  // Origin filter (referral channel)
  if (origin) {
    queryObject.origin = { $regex: `${origin}`, $options: "i" };
  }

  // Date filters
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    queryObject.createdAt = { $gte: start, $lte: end };
  } else if (day) {
    let date = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    date.setDate(date.getDate() - Number(day));
    date.setHours(0, 0, 0, 0);
    queryObject.createdAt = { $gte: date, $lte: today };
  }

  // Payment method filter
  if (method) {
    queryObject.paymentMethod = { $regex: `${method}`, $options: "i" };
  }

  // Pagination
  const pages = Number(page) || 1;
  const limits = Number(limit) || 50;
  const skip = (pages - 1) * limits;

  // Sorting
  let sortObject = { createdAt: -1 }; // Default sort by date descending
  if (sortBy) {
    if (sortBy === "date") {
      sortObject = { createdAt: sortOrder === "asc" ? 1 : -1 };
    } else if (sortBy === "total") {
      sortObject = { total: sortOrder === "asc" ? 1 : -1 };
    } else if (sortBy === "orderId") {
      sortObject = { orderId: sortOrder === "asc" ? 1 : -1 };
    }
  }

  try {
    // Get status counts for header tabs using helper function
    const statusCounts = await getStatusCounts(
      includeTrashed === "true"
    );

    // Total orders count matching filters
    const totalDoc = await Order.countDocuments(queryObject);

    // Get orders with all necessary fields
    const orders = await Order.find(queryObject)
      .select(
        "_id invoice orderId paymentMethod subTotal total user_info discount shippingCost status createdAt updatedAt shipmentTracking origin isTrashed staffNotes cart"
      )
      .populate("user", "name email")
      .populate("staffNotes.addedBy", "name email")
      .sort(sortObject)
      .skip(skip)
      .limit(limits);

    // Method totals (for backward compatibility)
    let methodTotals = [];
    if (startDate && endDate) {
      const filteredOrders = await Order.find(queryObject, {
        _id: 1,
        total: 1,
        paymentMethod: 1,
        updatedAt: 1,
      }).sort({ updatedAt: -1 });
      for (const order of filteredOrders) {
        const { paymentMethod, total } = order;
        const existPayment = methodTotals.find(
          (item) => item.method === paymentMethod
        );

        if (existPayment) {
          existPayment.total += total;
        } else {
          methodTotals.push({
            method: paymentMethod,
            total: total,
          });
        }
      }
    }

    res.send({
      orders,
      limits,
      pages,
      totalDoc,
      methodTotals,
      statusCounts,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderCustomer = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ _id: -1 });
    res.send(orders);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone address city country zipCode")
      .populate("staffNotes.addedBy", "name email");

    if (!order) {
      return res.status(404).send({
        message: "Order not found",
      });
    }

    // Get status history using helper function
    const statusHistory = await getOrderStatusHistory(req.params.id);

    // Get shipment info if exists
    const shipment = await Shipment.findOne({ orderId: req.params.id });

    res.send({
      order,
      statusHistory,
      shipment,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;
    const adminId = req.user?._id; // From JWT token

    // Get current order to track status change
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      return res.status(404).send({
        message: "Order not found",
      });
    }

    const oldStatus = currentOrder.status;
    const newStatus = updateData.status;

    // Validate status transition (optional - can be used for warnings)
    if (newStatus && newStatus !== oldStatus) {
      const validation = validateStatusTransition(oldStatus, newStatus);
      if (!validation.valid) {
        return res.status(400).send({
          message: validation.message,
        });
      }
      // Log warning if unusual transition (optional)
      if (validation.message.includes("Warning")) {
        console.warn(validation.message, {
          orderId,
          oldStatus,
          newStatus,
        });
      }
    }

    // Build update object
    const updateObject = {};
    if (updateData.status) updateObject.status = updateData.status;
    if (updateData.shipmentTracking !== undefined)
      updateObject.shipmentTracking = updateData.shipmentTracking;
    if (updateData.origin) updateObject.origin = updateData.origin;
    if (updateData.isTrashed !== undefined)
      updateObject.isTrashed = updateData.isTrashed;

    // Update order
    await Order.updateOne({ _id: orderId }, { $set: updateObject });

    // Log status change if status was updated
    if (newStatus && newStatus !== oldStatus && adminId) {
      await OrderStatusHistory.create({
        orderId: orderId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedBy: adminId,
        reason: updateData.reason || "",
      });
    }

    res.status(200).send({
      message: "Order Updated Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    // Soft delete - move to trash
    await Order.updateOne(
      { _id: req.params.id },
      { $set: { isTrashed: true } }
    );

    res.status(200).send({
      message: "Order moved to trash successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get dashboard recent order
const getDashboardRecentOrder = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const queryObject = {};

    queryObject.$or = [
      { status: { $regex: `Pending`, $options: "i" } },
      { status: { $regex: `Processing`, $options: "i" } },
      { status: { $regex: `Delivered`, $options: "i" } },
      { status: { $regex: `Cancel`, $options: "i" } },
    ];

    const totalDoc = await Order.countDocuments(queryObject);

    // query for orders
    const orders = await Order.find(queryObject)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limits);

    // console.log('order------------<', orders);

    res.send({
      orders: orders,
      page: page,
      limit: limit,
      totalOrder: totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get dashboard count
const getDashboardCount = async (req, res) => {
  try {
    const totalDoc = await Order.countDocuments();

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
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

    // total processing order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    res.send({
      totalOrder: totalDoc,
      totalPendingOrder: totalPendingOrder[0] || 0,
      totalProcessingOrder: totalProcessingOrder[0]?.count || 0,
      totalDeliveredOrder: totalDeliveredOrder[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardAmount = async (req, res) => {
  // console.log('total')
  let week = new Date();
  week.setDate(week.getDate() - 10);

  const currentDate = new Date();
  currentDate.setDate(1); // Set the date to the first day of the current month
  currentDate.setHours(0, 0, 0, 0); // Set the time to midnight

  const lastMonthStartDate = new Date(currentDate); // Copy the current date
  lastMonthStartDate.setMonth(currentDate.getMonth() - 1); // Subtract one month

  let lastMonthEndDate = new Date(currentDate); // Copy the current date
  lastMonthEndDate.setDate(0); // Set the date to the last day of the previous month
  lastMonthEndDate.setHours(23, 59, 59, 999); // Set the time to the end of the day

  try {
    // total order amount
    const totalAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);
    // console.log('totalAmount',totalAmount)
    const thisMonthOrderAmount = await Order.aggregate([
      {
        $project: {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          total: 1,
          subTotal: 1,
          discount: 1,
          updatedAt: 1,
          createdAt: 1,
          status: 1,
        },
      },
      {
        $match: {
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],
          year: { $eq: new Date().getFullYear() },
          month: { $eq: new Date().getMonth() + 1 },
          // $expr: {
          //   $eq: [{ $month: "$updatedAt" }, { $month: new Date() }],
          // },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
          subTotal: {
            $sum: "$subTotal",
          },

          discount: {
            $sum: "$discount",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    const lastMonthOrderAmount = await Order.aggregate([
      {
        $project: {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          total: 1,
          subTotal: 1,
          discount: 1,
          updatedAt: 1,
          createdAt: 1,
          status: 1,
        },
      },
      {
        $match: {
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],

          updatedAt: { $gt: lastMonthStartDate, $lt: lastMonthEndDate },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
          subTotal: {
            $sum: "$subTotal",
          },

          discount: {
            $sum: "$discount",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // console.log("thisMonthlyOrderAmount ===>", thisMonthlyOrderAmount);

    // order list last 10 days
    const orderFilteringData = await Order.find(
      {
        $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
        updatedAt: {
          $gte: week,
        },
      },

      {
        paymentMethod: 1,
        paymentDetails: 1,
        total: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );

    res.send({
      totalAmount:
        totalAmount.length === 0
          ? 0
          : parseFloat(totalAmount[0].tAmount).toFixed(2),
      thisMonthlyOrderAmount: thisMonthOrderAmount[0]?.total,
      lastMonthOrderAmount: lastMonthOrderAmount[0]?.total,
      ordersData: orderFilteringData,
    });
  } catch (err) {
    // console.log('err',err)
    res.status(500).send({
      message: err.message,
    });
  }
};

const bestSellerProductChart = async (req, res) => {
  try {
    const totalDoc = await Order.countDocuments({});
    const bestSellingProduct = await Order.aggregate([
      {
        $unwind: "$cart",
      },
      {
        $group: {
          _id: "$cart.title",

          count: {
            $sum: "$cart.quantity",
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 4,
      },
    ]);

    res.send({
      totalDoc,
      bestSellingProduct,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardOrders = async (req, res) => {
  const { page, limit } = req.query;

  const pages = Number(page) || 1;
  const limits = Number(limit) || 8;
  const skip = (pages - 1) * limits;

  let week = new Date();
  week.setDate(week.getDate() - 10);

  const start = new Date().toDateString();

  // (startDate = '12:00'),
  //   (endDate = '23:59'),
  // console.log("page, limit", page, limit);

  try {
    const totalDoc = await Order.countDocuments({});

    // query for orders
    const orders = await Order.find({})
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    const totalAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);

    // total order amount
    const todayOrder = await Order.find({ createdAt: { $gte: start } });

    // this month order amount
    const totalAmountOfThisMonth = await Order.aggregate([
      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },
            month: {
              $month: "$createdAt",
            },
          },
          total: {
            $sum: "$total",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
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

    // total delivered order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
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

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
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

    //weekly sale report
    // filter order data
    const weeklySaleReport = await Order.find({
      $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
      createdAt: {
        $gte: week,
      },
    });

    res.send({
      totalOrder: totalDoc,
      totalAmount:
        totalAmount.length === 0
          ? 0
          : parseFloat(totalAmount[0].tAmount).toFixed(2),
      todayOrder: todayOrder,
      totalAmountOfThisMonth:
        totalAmountOfThisMonth.length === 0
          ? 0
          : parseFloat(totalAmountOfThisMonth[0].total).toFixed(2),
      totalPendingOrder:
        totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0],
      totalProcessingOrder:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      totalDeliveredOrder:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,
      orders,
      weeklySaleReport,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Bulk update orders
const bulkUpdateOrders = async (req, res) => {
  try {
    const { orderIds, action, status, reason } = req.body;
    const adminId = req.user?._id; // From JWT token

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).send({
        message: "Order IDs array is required",
      });
    }

    if (!action) {
      return res.status(400).send({
        message: "Action is required",
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          results.failed.push({
            orderId,
            message: "Order not found",
          });
          continue;
        }

        if (action === "trash") {
          // Move to trash
          await Order.updateOne(
            { _id: orderId },
            { $set: { isTrashed: true } }
          );
          results.success.push({ orderId, action: "trashed" });
        } else if (action === "changeStatus" && status) {
          // Change status
          const oldStatus = order.status;

          // Validate status transition (optional - can be used for warnings)
          if (oldStatus !== status) {
            const validation = validateStatusTransition(oldStatus, status);
            if (!validation.valid) {
              results.failed.push({
                orderId,
                message: validation.message,
              });
              continue;
            }
          }

          await Order.updateOne(
            { _id: orderId },
            { $set: { status: status } }
          );

          // Log status change
          if (adminId && oldStatus !== status) {
            await OrderStatusHistory.create({
              orderId: orderId,
              oldStatus: oldStatus,
              newStatus: status,
              changedBy: adminId,
              reason: reason || "",
            });
          }

          results.success.push({ orderId, action: "status changed", status });
        } else {
          results.failed.push({
            orderId,
            message: "Invalid action or missing status",
          });
        }
      } catch (err) {
        results.failed.push({
          orderId,
          message: err.message,
        });
      }
    }

    res.status(200).send({
      message: `Bulk update completed. ${results.success.length} succeeded, ${results.failed.length} failed.`,
      results,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Add note to order
const addOrderNote = async (req, res) => {
  try {
    const { note } = req.body;
    const orderId = req.params.id;
    const adminId = req.user?._id; // From JWT token

    if (!note || note.trim() === "") {
      return res.status(400).send({
        message: "Note is required",
      });
    }

    if (!adminId) {
      return res.status(401).send({
        message: "Admin authentication required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send({
        message: "Order not found",
      });
    }

    // Add note to order
    order.staffNotes.push({
      note: note.trim(),
      addedBy: adminId,
      addedAt: new Date(),
    });

    await order.save();

    // Populate the addedBy field for response
    await order.populate("staffNotes.addedBy", "name email");

    res.status(200).send({
      message: "Note added successfully",
      notes: order.staffNotes,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Export orders to CSV
const exportOrders = async (req, res) => {
  try {
    // Use same query logic as getAllOrders
    const {
      day,
      status,
      method,
      endDate,
      startDate,
      customerName,
      customer,
      origin,
      search,
      includeTrashed,
    } = req.query;

    const queryObject = {};

    if (!includeTrashed || includeTrashed === "false") {
      queryObject.isTrashed = false;
    }

    if (status && status !== "All") {
      if (status === "Completed") {
        queryObject.status = "Completed";
      } else if (status === "Refunded") {
        queryObject.status = "Refunded";
      } else {
        queryObject.status = { $regex: `${status}`, $options: "i" };
      }
    }

    if (search) {
      queryObject.$or = [
        { orderId: { $regex: `${search}`, $options: "i" } },
        { invoice: { $regex: `${search}`, $options: "i" } },
        { "user_info.name": { $regex: `${search}`, $options: "i" } },
        { "user_info.email": { $regex: `${search}`, $options: "i" } },
      ];
    }

    if (customer) {
      queryObject.$or = [
        { "user_info.name": { $regex: `${customer}`, $options: "i" } },
        { "user_info.email": { $regex: `${customer}`, $options: "i" } },
      ];
    }

    if (customerName && !customer) {
      queryObject.$or = [
        { "user_info.name": { $regex: `${customerName}`, $options: "i" } },
        { invoice: { $regex: `${customerName}`, $options: "i" } },
      ];
    }

    if (origin) {
      queryObject.origin = { $regex: `${origin}`, $options: "i" };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      queryObject.createdAt = { $gte: start, $lte: end };
    } else if (day) {
      let date = new Date();
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      date.setDate(date.getDate() - Number(day));
      date.setHours(0, 0, 0, 0);
      queryObject.createdAt = { $gte: date, $lte: today };
    }

    if (method) {
      queryObject.paymentMethod = { $regex: `${method}`, $options: "i" };
    }

    // Get all matching orders (no pagination for export)
    const orders = await Order.find(queryObject)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    // Format data for CSV using helper function
    const csvData = orders.map((order) => formatOrderForExport(order));

    // Define CSV fields (matching formatOrderForExport output)
    const fields = [
      "Order ID",
      "Invoice",
      "Customer Name",
      "Customer Email",
      "Order Date",
      "Order Time",
      "Status",
      "Payment Method",
      "Sub Total",
      "Discount",
      "Shipping Cost",
      "Total",
      "Shipment Tracking",
      "Origin",
      "Address",
      "City",
      "Country",
      "Zip Code",
      "Contact",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orders_${new Date().toISOString().split("T")[0]}.csv`
    );

    res.send(csv);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
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
};
