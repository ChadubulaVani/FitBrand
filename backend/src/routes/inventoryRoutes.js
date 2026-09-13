const express = require("express");

const {
  createInventory,
  getInventory,
  getInventoryByProduct,
  adjustInventory,
  reserveStock,
  releaseStock,
  getLowStockInventory,
  getInventoryMovements,
  getExpiringInventory,
} = require("../controllers/inventoryController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Admin / Operations / Brand Owner
const inventoryManagers = authorizeRoles("admin", "operations", "brand_owner");

// View inventory
router.get("/", protect, inventoryManagers, getInventory);

// Low stock
router.get("/low-stock", protect, inventoryManagers, getLowStockInventory);

// Expiring inventory
router.get("/expiring", protect, inventoryManagers, getExpiringInventory);

// Inventory by product
router.get(
  "/product/:productId",
  protect,
  inventoryManagers,
  getInventoryByProduct,
);

// Create inventory
router.post("/", protect, inventoryManagers, createInventory);

// Adjust stock
router.put("/:id/adjust", protect, inventoryManagers, adjustInventory);

// Reserve stock
router.put("/:id/reserve", protect, inventoryManagers, reserveStock);

// Release reserved stock
router.put("/:id/release", protect, inventoryManagers, releaseStock);

// Movement history
router.get("/:id/movements", protect, inventoryManagers, getInventoryMovements);

module.exports = router;
