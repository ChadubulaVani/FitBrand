const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const Shipment = require("../models/Shipment");

// ============================================================
// Dashboard
// ============================================================

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      activeProducts,
      totalOrders,
      activeOrders,
      inventoryItems,
      lowStockItems,
      totalShipments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),

      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),

      Order.countDocuments(),
      Order.countDocuments({
        orderStatus: {
          $nin: ["cancelled", "returned", "delivered"],
        },
      }),

      Inventory.countDocuments({ isActive: true }),

      Inventory.countDocuments({
        isActive: true,
        $expr: {
          $lte: [
            { $subtract: ["$totalStock", "$reservedStock"] },
            "$lowStockThreshold",
          ],
        },
      }),

      Shipment.countDocuments(),
    ]);

    const revenueResult = await Order.aggregate([
      {
        $match: {
          orderStatus: {
            $nin: ["cancelled", "returned"],
          },
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return res.status(200).json({
      message: "Admin dashboard retrieved successfully",
      dashboard: {
        totalUsers,
        activeUsers,
        totalProducts,
        activeProducts,
        totalOrders,
        activeOrders,
        inventoryItems,
        lowStockItems,
        totalShipments,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving admin dashboard",
    });
  }
};

// ============================================================
// Users
// ============================================================

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Users retrieved successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving user",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be a boolean",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error.message);

    return res.status(500).json({
      message: "Server error while updating user status",
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const allowedRoles = ["customer", "brand_owner", "operations", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message:
          "Invalid role. Allowed roles: customer, brand_owner, operations, admin",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error.message);

    return res.status(500).json({
      message: "Server error while updating user role",
    });
  }
};

// ============================================================
// Products
// ============================================================

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name slug")
      .populate("brandOwner", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Products retrieved successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get all products error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving products",
    });
  }
};

// ============================================================
// Orders
// ============================================================

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email phone")
      .populate("items.product", "name slug sku brand brandOwner")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Orders retrieved successfully",
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving orders",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name slug sku brand brandOwner");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  } catch (error) {
    console.error("Get order error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving order",
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const allowedStatuses = [
      "placed",
      "confirmed",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "returned",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.orderStatus = orderStatus;

    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error.message);

    return res.status(500).json({
      message: "Server error while updating order status",
    });
  }
};

// ============================================================
// Inventory
// ============================================================

const getAllInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({
      isActive: true,
    })
      .populate(
        "product",
        "name slug sku brand stockQuantity isActive brandOwner",
      )
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Inventory retrieved successfully",
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error("Get all inventory error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving inventory",
    });
  }
};

const getLowStockInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({
      isActive: true,
      $expr: {
        $lte: [
          {
            $subtract: ["$totalStock", "$reservedStock"],
          },
          "$lowStockThreshold",
        ],
      },
    })
      .populate(
        "product",
        "name slug sku brand stockQuantity isActive brandOwner",
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Low-stock inventory retrieved successfully",
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error("Low-stock inventory error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving low-stock inventory",
    });
  }
};

const getInventoryMovements = async (req, res) => {
  try {
    const movements = await InventoryMovement.find()
      .populate("product", "name sku brand")
      .populate("inventory", "totalStock reservedStock")
      .populate("batch", "batchNumber expiryDate")
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Inventory movements retrieved successfully",
      count: movements.length,
      movements,
    });
  } catch (error) {
    console.error("Inventory movements error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving inventory movements",
    });
  }
};

// ============================================================
// Shipments
// ============================================================

const getAllShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate("order", "orderNumber orderStatus totalAmount")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Shipments retrieved successfully",
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    console.error("Get all shipments error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving shipments",
    });
  }
};

// ============================================================
// Exports
// ============================================================

module.exports = {
  getAdminDashboard,

  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,

  getAllProducts,

  getAllOrders,
  getOrderById,
  updateOrderStatus,

  getAllInventory,
  getLowStockInventory,
  getInventoryMovements,

  getAllShipments,
};
