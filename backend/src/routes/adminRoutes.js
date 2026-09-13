const express = require("express");

const {
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
} = require("../controllers/adminController");

const {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
  updateTenantStatus,
  assignTenantToUser,
  assignTenantToProduct,
} = require("../controllers/tenantController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ============================================================
// Phase 12 — Operations / Admin Authorization
// ============================================================

router.use(protect);

router.use(authorizeRoles("admin", "operations"));

// ============================================================
// Dashboard
// ============================================================

router.get("/dashboard", getAdminDashboard);

// ============================================================
// Users
// ============================================================

router.get("/users", getAllUsers);

router.get("/users/:id", getUserById);

router.put("/users/:id/status", updateUserStatus);

router.put("/users/:id/role", updateUserRole);

// ============================================================
// Products
// ============================================================

router.get("/products", getAllProducts);

// ============================================================
// Orders
// ============================================================

router.get("/orders", getAllOrders);

router.get("/orders/:id", getOrderById);

router.put("/orders/:id/status", updateOrderStatus);

// ============================================================
// Inventory
// ============================================================

router.get("/inventory", getAllInventory);

router.get("/inventory/low-stock", getLowStockInventory);

router.get("/inventory/movements", getInventoryMovements);

// ============================================================
// Shipments
// ============================================================

router.get("/shipments", getAllShipments);

// ============================================================
// Phase 14 — Multi-Tenant / White-Label
// ============================================================

router.post("/tenants", createTenant);

router.get("/tenants", getAllTenants);

router.get("/tenants/:id", getTenantById);

router.put("/tenants/:id", updateTenant);

router.put("/tenants/:id/status", updateTenantStatus);

router.put("/users/:userId/tenant", assignTenantToUser);

router.put("/products/:productId/tenant", assignTenantToProduct);

module.exports = router;
