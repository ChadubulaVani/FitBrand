const express = require("express");

const {
  getBrandDashboard,
  getMyProducts,
  createBrandProduct,
  getMyProductById,
  updateMyProduct,
  deactivateMyProduct,
  getMyInventory,
  getMyLowStock,
  getMyOrders,
  getMyShipments,
} = require("../controllers/brandOwnerController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const brandOwnerAccess = authorizeRoles("brand_owner", "admin");

// ==================================================
// Dashboard
// ==================================================

router.get("/dashboard", protect, brandOwnerAccess, getBrandDashboard);

// ==================================================
// Products
// ==================================================

router.get("/products", protect, brandOwnerAccess, getMyProducts);

router.post("/products", protect, brandOwnerAccess, createBrandProduct);

router.get("/products/:id", protect, brandOwnerAccess, getMyProductById);

router.put("/products/:id", protect, brandOwnerAccess, updateMyProduct);

router.put(
  "/products/:id/deactivate",
  protect,
  brandOwnerAccess,
  deactivateMyProduct,
);

// ==================================================
// Inventory
// ==================================================

router.get("/inventory", protect, brandOwnerAccess, getMyInventory);

router.get("/inventory/low-stock", protect, brandOwnerAccess, getMyLowStock);

// ==================================================
// Orders
// ==================================================

router.get("/orders", protect, brandOwnerAccess, getMyOrders);

// ==================================================
// Shipments
// ==================================================

router.get("/shipments", protect, brandOwnerAccess, getMyShipments);

module.exports = router;
