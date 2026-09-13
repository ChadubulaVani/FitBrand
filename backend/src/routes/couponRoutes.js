const express = require("express");

const {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} = require("../controllers/couponController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const couponManagers = authorizeRoles("admin", "operations", "brand_owner");

// Customer coupon validation
router.post("/validate", protect, validateCoupon);

// Manager CRUD
router.get("/", protect, couponManagers, getCoupons);

router.get("/:id", protect, couponManagers, getCouponById);

router.post("/", protect, couponManagers, createCoupon);

router.put("/:id", protect, couponManagers, updateCoupon);

router.delete("/:id", protect, couponManagers, deleteCoupon);

module.exports = router;
