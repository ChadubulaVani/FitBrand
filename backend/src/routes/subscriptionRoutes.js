const express = require("express");

const {
  createSubscriptionPlan,
  getSubscriptionPlans,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createSubscription,
  getMySubscriptions,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getAllSubscriptions,
  renewSubscription,
} = require("../controllers/subscriptionController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const planManagers = authorizeRoles("admin", "operations", "brand_owner");

// Public/customer plan listing
router.get("/plans", getSubscriptionPlans);

// Customer subscription APIs
router.post("/", protect, createSubscription);

router.get("/my-subscriptions", protect, getMySubscriptions);

router.get("/:id", protect, getSubscriptionById);

router.put("/:id/pause", protect, pauseSubscription);

router.put("/:id/resume", protect, resumeSubscription);

router.put("/:id/cancel", protect, cancelSubscription);

router.put("/:id/renew", protect, renewSubscription);

// Manager plan APIs
router.get(
  "/management/all-plans",
  protect,
  planManagers,
  getAllSubscriptionPlans,
);

router.get(
  "/management/plans/:id",
  protect,
  planManagers,
  getSubscriptionPlanById,
);

router.post("/management/plans", protect, planManagers, createSubscriptionPlan);

router.put(
  "/management/plans/:id",
  protect,
  planManagers,
  updateSubscriptionPlan,
);

router.delete(
  "/management/plans/:id",
  protect,
  planManagers,
  deleteSubscriptionPlan,
);

router.get(
  "/management/all-subscriptions",
  protect,
  planManagers,
  getAllSubscriptions,
);

module.exports = router;
