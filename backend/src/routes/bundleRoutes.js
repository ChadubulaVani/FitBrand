const express = require("express");

const {
  getBundles,
  getBundleById,
  getBundlePricing,
  checkBundleAvailability,
  createBundle,
  getAllBundles,
  updateBundle,
  deleteBundle,
} = require("../controllers/bundleController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const bundleManagers = authorizeRoles("admin", "operations", "brand_owner");

// Customer/storefront
router.get("/", getBundles);

router.get("/:id/pricing", getBundlePricing);

router.get("/:id/availability", checkBundleAvailability);

router.get("/:id", getBundleById);

// Management
router.get("/management/all", protect, bundleManagers, getAllBundles);

router.post("/management", protect, bundleManagers, createBundle);

router.put("/management/:id", protect, bundleManagers, updateBundle);

router.delete("/management/:id", protect, bundleManagers, deleteBundle);

module.exports = router;
