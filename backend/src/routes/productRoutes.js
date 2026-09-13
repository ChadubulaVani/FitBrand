const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin / Brand Owner routes
router.post(
  "/",
  protect,
  authorizeRoles("admin", "brand_owner"),
  createProduct,
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "brand_owner"),
  updateProduct,
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "brand_owner"),
  deleteProduct,
);

module.exports = router;
