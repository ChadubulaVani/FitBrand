const express = require("express");

const {
  getTrackingHistory,
  getTrackingByNumber,
  addTrackingEvent,
} = require("../controllers/trackingController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const trackingManagers = authorizeRoles("admin", "operations", "brand_owner");

// Customer / authenticated tracking
router.get("/shipment/:id", protect, getTrackingHistory);

router.get("/number/:trackingNumber", protect, getTrackingByNumber);

// Management
router.post(
  "/management/shipment/:id/events",
  protect,
  trackingManagers,
  addTrackingEvent,
);

module.exports = router;
