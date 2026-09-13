const SubscriptionPlan = require("../models/SubscriptionPlan");
const Subscription = require("../models/Subscription");
const Product = require("../models/Product");

const addBillingPeriod = (date, frequency) => {
  const result = new Date(date);

  if (frequency === "monthly") {
    result.setMonth(result.getMonth() + 1);
  }

  if (frequency === "quarterly") {
    result.setMonth(result.getMonth() + 3);
  }

  return result;
};

const validatePlanProducts = async (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      valid: false,
      message: "At least one product is required",
    };
  }

  for (const item of products) {
    if (!item.product) {
      return {
        valid: false,
        message: "Product ID is required",
      };
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return {
        valid: false,
        message: "Product quantity must be at least 1",
      };
    }

    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      return {
        valid: false,
        message: `Product ${item.product} is not available`,
      };
    }
  }

  return {
    valid: true,
  };
};

// =========================
// ADMIN / MANAGER APIs
// =========================

const createSubscriptionPlan = async (req, res) => {
  try {
    const { name, description, frequency, price, products } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Subscription plan name is required",
      });
    }

    if (!["monthly", "quarterly"].includes(frequency)) {
      return res.status(400).json({
        message: "Frequency must be monthly or quarterly",
      });
    }

    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({
        message: "Valid subscription price is required",
      });
    }

    const productValidation = await validatePlanProducts(products);

    if (!productValidation.valid) {
      return res.status(400).json({
        message: productValidation.message,
      });
    }

    const plan = await SubscriptionPlan.create({
      name,
      description: description || "",
      frequency,
      price,
      products,
      isActive: true,
    });

    const populatedPlan = await SubscriptionPlan.findById(plan._id).populate(
      "products.product",
      "name sku price discountPrice",
    );

    res.status(201).json({
      message: "Subscription plan created successfully",
      plan: populatedPlan,
    });
  } catch (error) {
    console.error("Create subscription plan error:", error.message);

    res.status(400).json({
      message: error.message || "Unable to create subscription plan",
    });
  }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({
      isActive: true,
    })
      .populate("products.product", "name sku price discountPrice images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Subscription plans retrieved successfully",
      count: plans.length,
      plans,
    });
  } catch (error) {
    console.error("Get subscription plans error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving subscription plans",
    });
  }
};

const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find()
      .populate("products.product", "name sku price discountPrice")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All subscription plans retrieved successfully",
      count: plans.length,
      plans,
    });
  } catch (error) {
    console.error("Get all subscription plans error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving subscription plans",
    });
  }
};

const getSubscriptionPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id).populate(
      "products.product",
      "name sku price discountPrice images",
    );

    if (!plan) {
      return res.status(404).json({
        message: "Subscription plan not found",
      });
    }

    res.status(200).json({
      message: "Subscription plan retrieved successfully",
      plan,
    });
  } catch (error) {
    console.error("Get subscription plan error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving subscription plan",
    });
  }
};

const updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        message: "Subscription plan not found",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "frequency",
      "price",
      "products",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        plan[field] = req.body[field];
      }
    }

    if (plan.frequency !== "monthly" && plan.frequency !== "quarterly") {
      return res.status(400).json({
        message: "Frequency must be monthly or quarterly",
      });
    }

    if (plan.price < 0) {
      return res.status(400).json({
        message: "Subscription price cannot be negative",
      });
    }

    if (req.body.products !== undefined) {
      const productValidation = await validatePlanProducts(plan.products);

      if (!productValidation.valid) {
        return res.status(400).json({
          message: productValidation.message,
        });
      }
    }

    await plan.save();

    const updatedPlan = await SubscriptionPlan.findById(plan._id).populate(
      "products.product",
      "name sku price discountPrice",
    );

    res.status(200).json({
      message: "Subscription plan updated successfully",
      plan: updatedPlan,
    });
  } catch (error) {
    console.error("Update subscription plan error:", error.message);

    res.status(400).json({
      message: error.message || "Unable to update subscription plan",
    });
  }
};

const deleteSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        message: "Subscription plan not found",
      });
    }

    plan.isActive = false;

    await plan.save();

    res.status(200).json({
      message: "Subscription plan deactivated successfully",
      plan,
    });
  } catch (error) {
    console.error("Delete subscription plan error:", error.message);

    res.status(500).json({
      message: "Server error while deactivating subscription plan",
    });
  }
};

// =========================
// CUSTOMER SUBSCRIPTIONS
// =========================

const createSubscription = async (req, res) => {
  try {
    const { planId, notes } = req.body;

    if (!planId) {
      return res.status(400).json({
        message: "Subscription plan ID is required",
      });
    }

    const plan = await SubscriptionPlan.findOne({
      _id: planId,
      isActive: true,
    });

    if (!plan) {
      return res.status(404).json({
        message: "Subscription plan not found or inactive",
      });
    }

    const existingSubscription = await Subscription.findOne({
      user: req.user.userId,
      plan: plan._id,
      status: {
        $in: ["active", "paused"],
      },
    });

    if (existingSubscription) {
      return res.status(409).json({
        message: "You already have an active subscription for this plan",
      });
    }

    const startDate = new Date();

    const nextBillingDate = addBillingPeriod(startDate, plan.frequency);

    const subscription = await Subscription.create({
      user: req.user.userId,
      plan: plan._id,
      status: "active",
      startDate,
      nextBillingDate,
      notes: notes || "",
    });

    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate("plan", "name description frequency price products")
      .populate("plan.products.product", "name sku price discountPrice");

    res.status(201).json({
      message: "Subscription created successfully",
      subscription: populatedSubscription,
    });
  } catch (error) {
    console.error("Create subscription error:", error.message);

    res.status(400).json({
      message: error.message || "Unable to create subscription",
    });
  }
};

const getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      user: req.user.userId,
    })
      .populate("plan", "name description frequency price products")
      .populate("plan.products.product", "name sku price discountPrice images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Subscriptions retrieved successfully",
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error("Get my subscriptions error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving subscriptions",
    });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    })
      .populate("plan", "name description frequency price products")
      .populate("plan.products.product", "name sku price discountPrice images");

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    res.status(200).json({
      message: "Subscription retrieved successfully",
      subscription,
    });
  } catch (error) {
    console.error("Get subscription error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving subscription",
    });
  }
};

const pauseSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    if (subscription.status !== "active") {
      return res.status(400).json({
        message: "Only active subscriptions can be paused",
      });
    }

    subscription.status = "paused";
    subscription.pausedAt = new Date();

    await subscription.save();

    res.status(200).json({
      message: "Subscription paused successfully",
      subscription,
    });
  } catch (error) {
    console.error("Pause subscription error:", error.message);

    res.status(500).json({
      message: "Server error while pausing subscription",
    });
  }
};

const resumeSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("plan");

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    if (subscription.status !== "paused") {
      return res.status(400).json({
        message: "Only paused subscriptions can be resumed",
      });
    }

    subscription.status = "active";
    subscription.pausedAt = null;

    if (subscription.nextBillingDate <= new Date()) {
      subscription.nextBillingDate = addBillingPeriod(
        new Date(),
        subscription.plan.frequency,
      );
    }

    await subscription.save();

    res.status(200).json({
      message: "Subscription resumed successfully",
      subscription,
    });
  } catch (error) {
    console.error("Resume subscription error:", error.message);

    res.status(500).json({
      message: "Server error while resuming subscription",
    });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({
        message: "Subscription is already cancelled",
      });
    }

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();

    await subscription.save();

    res.status(200).json({
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error.message);

    res.status(500).json({
      message: "Server error while cancelling subscription",
    });
  }
};

const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("user", "name email phone role")
      .populate("plan", "name description frequency price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All subscriptions retrieved successfully",
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error("Get all subscriptions error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving subscriptions",
    });
  }
};

const renewSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("plan");

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    if (subscription.status !== "active") {
      return res.status(400).json({
        message: "Only active subscriptions can be renewed",
      });
    }

    const now = new Date();

    subscription.lastBillingDate =
      subscription.nextBillingDate > now
        ? new Date(subscription.nextBillingDate)
        : now;

    subscription.nextBillingDate = addBillingPeriod(
      subscription.lastBillingDate,
      subscription.plan.frequency,
    );

    await subscription.save();

    res.status(200).json({
      message: "Subscription renewed successfully",
      subscription,
    });
  } catch (error) {
    console.error("Renew subscription error:", error.message);

    res.status(500).json({
      message: "Server error while renewing subscription",
    });
  }
};

module.exports = {
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
};
