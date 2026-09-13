const express = require("express");

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin / Brand Owner routes
router.post(
  "/",
  protect,
  authorizeRoles("admin", "brand_owner"),
  createCategory,
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "brand_owner"),
  updateCategory,
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "brand_owner"),
  deleteCategory,
);

module.exports = router;
