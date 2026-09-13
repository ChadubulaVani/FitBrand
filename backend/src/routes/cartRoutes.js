const express = require("express");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// All cart operations require authentication

router.get("/", protect, getCart);

router.post("/items", protect, addToCart);

router.put("/items/:itemId", protect, updateCartItem);

router.delete("/items/:itemId", protect, removeFromCart);

router.delete("/", protect, clearCart);

module.exports = router;
