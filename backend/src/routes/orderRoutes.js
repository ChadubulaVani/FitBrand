const express = require("express");

const {
  getCheckoutPreview,
  placeOrder,
  getMyOrders,
  getOrderById,
} = require("../controllers/orderController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/checkout", protect, getCheckoutPreview);

router.post("/", protect, placeOrder);

router.get("/my-orders", protect, getMyOrders);

router.get("/:id", protect, getOrderById);

module.exports = router;
