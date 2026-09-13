const express = require("express");

const {
  getDashboard,

  getMerchantProducts,
  getMerchantProductById,
  createMerchantProduct,
  updateMerchantProduct,
  deleteMerchantProduct,

  getMerchantInventory,
  getMerchantProductInventory,
  adjustMerchantInventory,
  getMerchantInventoryMovements,
  getMerchantLowStock,

  getMerchantOrders,
  getMerchantOrderById,
  updateMerchantOrderStatus,

  getMerchantShipments,
  getMerchantShipmentById,
} = require("../controllers/merchantController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ============================================================
// Phase 11 — Merchant / Brand Owner Authorization
// ============================================================

router.use(protect);
router.use(authorizeRoles("brand_owner"));

// ============================================================
// Dashboard
// ============================================================

// GET /api/merchant/dashboard
router.get("/dashboard", getDashboard);

// ============================================================
// Products
// ============================================================

// GET /api/merchant/products
router.get("/products", getMerchantProducts);

// GET /api/merchant/products/:id
router.get("/products/:id", getMerchantProductById);

// POST /api/merchant/products
router.post("/products", createMerchantProduct);

// PUT /api/merchant/products/:id
router.put("/products/:id", updateMerchantProduct);

// DELETE /api/merchant/products/:id
router.delete("/products/:id", deleteMerchantProduct);

// ============================================================
// Inventory
// ============================================================

// GET /api/merchant/inventory
router.get("/inventory", getMerchantInventory);

// GET /api/merchant/inventory/product/:productId
router.get("/inventory/product/:productId", getMerchantProductInventory);

// GET /api/merchant/inventory/low-stock
router.get("/inventory/low-stock", getMerchantLowStock);

// PUT /api/merchant/inventory/:id/adjust
router.put("/inventory/:id/adjust", adjustMerchantInventory);

// GET /api/merchant/inventory/:id/movements
router.get("/inventory/:id/movements", getMerchantInventoryMovements);

// ============================================================
// Orders
// ============================================================

// GET /api/merchant/orders
router.get("/orders", getMerchantOrders);

// GET /api/merchant/orders/:id
router.get("/orders/:id", getMerchantOrderById);

// PUT /api/merchant/orders/:id/status
router.put("/orders/:id/status", updateMerchantOrderStatus);

// ============================================================
// Shipments
// ============================================================

// GET /api/merchant/shipments
router.get("/shipments", getMerchantShipments);

// GET /api/merchant/shipments/:id
router.get("/shipments/:id", getMerchantShipmentById);

// ============================================================
// Export
// ============================================================

module.exports = router;
