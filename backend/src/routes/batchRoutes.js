const express = require("express");

const {
  createBatch,
  verifyBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
} = require("../controllers/batchController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Public routes
router.get("/", getBatches);
router.get("/verify/:batchNumber", verifyBatch);
router.get("/:id", getBatchById);

// Admin / Operations / Brand Owner routes
router.post(
  "/",
  protect,
  authorizeRoles("admin", "operations", "brand_owner"),
  createBatch,
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "operations", "brand_owner"),
  updateBatch,
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "operations", "brand_owner"),
  deleteBatch,
);

module.exports = router;
