const express = require("express");

const {
  createShipment,
  getShipmentById,
  getMyShipments,
  getAllShipments,
  assignCourier,
  updateShipmentStatus,
  cancelShipment,
  returnShipment,
} = require("../controllers/shipmentController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const shipmentManagers = authorizeRoles("admin", "operations", "brand_owner");

// Customer
router.get(
  "/my-shipments",
  protect,
  authorizeRoles("customer"),
  getMyShipments,
);

router.get("/:id", protect, getShipmentById);

// Management
router.get("/management/all", protect, shipmentManagers, getAllShipments);

router.post("/management", protect, shipmentManagers, createShipment);

router.put("/management/:id/courier", protect, shipmentManagers, assignCourier);

router.put(
  "/management/:id/status",
  protect,
  shipmentManagers,
  updateShipmentStatus,
);

router.put("/management/:id/cancel", protect, shipmentManagers, cancelShipment);

router.put("/management/:id/return", protect, shipmentManagers, returnShipment);

module.exports = router;
