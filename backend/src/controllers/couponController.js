const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const Order = require("../models/Order");

// Calculate coupon discount
const calculateCouponDiscount = (coupon, subtotal) => {
  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;

    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }

  if (coupon.discountType === "fixed") {
    discount = coupon.discountValue;
  }

  // Never allow discount greater than subtotal.
  discount = Math.min(discount, subtotal);

  return Number(discount.toFixed(2));
};

// Find coupon by code
const findCoupon = async (code) => {
  if (!code) {
    return null;
  }

  return Coupon.findOne({
    code: code.trim().toUpperCase(),
  });
};

// Validate coupon against user's cart
const validateCouponForUser = async ({ code, userId, cartItems }) => {
  const coupon = await findCoupon(code);

  if (!coupon) {
    return {
      valid: false,
      message: "Coupon not found",
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      message: "Coupon is inactive",
    };
  }

  const now = new Date();

  if (now < coupon.startDate) {
    return {
      valid: false,
      message: "Coupon is not active yet",
    };
  }

  if (now > coupon.endDate) {
    return {
      valid: false,
      message: "Coupon has expired",
    };
  }

  // Calculate subtotal using current product prices.
  let subtotal = 0;

  const products = [];

  for (const item of cartItems) {
    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      return {
        valid: false,
        message: "One or more products in the cart are no longer available",
      };
    }

    const unitPrice =
      product.discountPrice !== null && product.discountPrice !== undefined
        ? product.discountPrice
        : product.price;

    subtotal += unitPrice * item.quantity;

    products.push(product);
  }

  subtotal = Number(subtotal.toFixed(2));

  if (subtotal < coupon.minimumOrderValue) {
    return {
      valid: false,
      message: `Minimum order value for this coupon is ₹${coupon.minimumOrderValue}`,
      subtotal,
      minimumOrderValue: coupon.minimumOrderValue,
    };
  }

  // Product restriction
  if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
    const applicableProductIds = coupon.applicableProducts.map((id) =>
      id.toString(),
    );

    const hasApplicableProduct = products.some((product) =>
      applicableProductIds.includes(product._id.toString()),
    );

    if (!hasApplicableProduct) {
      return {
        valid: false,
        message: "Coupon is not applicable to the products in your cart",
      };
    }
  }

  // Category restriction
  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const applicableCategoryIds = coupon.applicableCategories.map((id) =>
      id.toString(),
    );

    const hasApplicableCategory = products.some((product) =>
      applicableCategoryIds.includes(product.category.toString()),
    );

    if (!hasApplicableCategory) {
      return {
        valid: false,
        message: "Coupon is not applicable to the categories in your cart",
      };
    }
  }

  // Total usage limit
  if (coupon.usageLimit !== null) {
    const totalUsage = await Order.countDocuments({
      couponCode: coupon.code,
    });

    if (totalUsage >= coupon.usageLimit) {
      return {
        valid: false,
        message: "Coupon usage limit has been reached",
      };
    }
  }

  // Per-user usage limit
  if (coupon.perUserLimit !== null) {
    const userUsage = await Order.countDocuments({
      user: userId,
      couponCode: coupon.code,
    });

    if (userUsage >= coupon.perUserLimit) {
      return {
        valid: false,
        message: "You have already reached the usage limit for this coupon",
      };
    }
  }

  const discount = calculateCouponDiscount(coupon, subtotal);

  return {
    valid: true,
    coupon,
    subtotal,
    discount,
    finalSubtotal: Number((subtotal - discount).toFixed(2)),
  };
};

// Create coupon
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minimumOrderValue,
      startDate,
      endDate,
      usageLimit,
      perUserLimit,
      applicableProducts,
      applicableCategories,
    } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "Coupon code is required",
      });
    }

    if (!discountType || !["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        message: "Discount type must be percentage or fixed",
      });
    }

    const existingCoupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
    });

    if (existingCoupon) {
      return res.status(409).json({
        message: "Coupon code already exists",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required",
      });
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      description: description || "",
      discountType,
      discountValue,
      maxDiscount: maxDiscount !== undefined ? maxDiscount : null,
      minimumOrderValue:
        minimumOrderValue !== undefined ? minimumOrderValue : 0,
      startDate,
      endDate,
      usageLimit: usageLimit !== undefined ? usageLimit : null,
      perUserLimit: perUserLimit !== undefined ? perUserLimit : 1,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      isActive: true,
    });

    res.status(201).json({
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Coupon code already exists",
      });
    }

    res.status(400).json({
      message: error.message || "Unable to create coupon",
    });
  }
};

// Get all coupons
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate("applicableProducts", "name sku price discountPrice")
      .populate("applicableCategories", "name slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Coupons retrieved successfully",
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.error("Get coupons error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving coupons",
    });
  }
};

// Get single coupon
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate("applicableProducts", "name sku price discountPrice")
      .populate("applicableCategories", "name slug");

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      message: "Coupon retrieved successfully",
      coupon,
    });
  } catch (error) {
    console.error("Get coupon error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving coupon",
    });
  }
};

// Update coupon
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
      });
    }

    const allowedFields = [
      "description",
      "discountType",
      "discountValue",
      "maxDiscount",
      "minimumOrderValue",
      "startDate",
      "endDate",
      "usageLimit",
      "perUserLimit",
      "applicableProducts",
      "applicableCategories",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        coupon[field] = req.body[field];
      }
    }

    await coupon.save();

    res.status(200).json({
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    console.error("Update coupon error:", error.message);

    res.status(400).json({
      message: error.message || "Unable to update coupon",
    });
  }
};

// Soft delete / deactivate coupon
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
      });
    }

    coupon.isActive = false;

    await coupon.save();

    res.status(200).json({
      message: "Coupon deactivated successfully",
      coupon,
    });
  } catch (error) {
    console.error("Delete coupon error:", error.message);

    res.status(500).json({
      message: "Server error while deactivating coupon",
    });
  }
};

// Validate coupon
const validateCoupon = async (req, res) => {
  try {
    const { code, cartItems } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "Coupon code is required",
      });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({
        message: "Cart items are required to validate the coupon",
      });
    }

    const result = await validateCouponForUser({
      code,
      userId: req.user.userId,
      cartItems,
    });

    if (!result.valid) {
      return res.status(400).json({
        message: result.message,
        ...(result.subtotal !== undefined ? { subtotal: result.subtotal } : {}),
        ...(result.minimumOrderValue !== undefined
          ? {
              minimumOrderValue: result.minimumOrderValue,
            }
          : {}),
      });
    }

    res.status(200).json({
      message: "Coupon is valid",
      coupon: {
        code: result.coupon.code,
        description: result.coupon.description,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
      },
      subtotal: result.subtotal,
      discount: result.discount,
      finalSubtotal: result.finalSubtotal,
    });
  } catch (error) {
    console.error("Validate coupon error:", error.message);

    res.status(500).json({
      message: "Server error while validating coupon",
    });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  validateCouponForUser,
};
