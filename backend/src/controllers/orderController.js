const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");

const { validateCouponForUser } = require("./couponController");

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `FB-${timestamp}-${random}`;
};

// Checkout preview
const getCheckoutPreview = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.userId,
    }).populate(
      "items.product",
      "name slug sku price discountPrice stockQuantity isActive",
    );

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return res.status(400).json({
          message: "One or more products in the cart are no longer available",
        });
      }

      if (item.quantity > product.stockQuantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
          availableStock: product.stockQuantity,
          requestedQuantity: item.quantity,
        });
      }

      const unitPrice =
        product.discountPrice !== null && product.discountPrice !== undefined
          ? product.discountPrice
          : product.price;

      subtotal += unitPrice * item.quantity;
    }

    subtotal = Number(subtotal.toFixed(2));

    const shippingFee = subtotal >= 2000 ? 0 : 100;

    let discount = 0;
    let couponCode = null;
    let couponDetails = null;

    // Coupon can be supplied as:
    // /api/orders/checkout?couponCode=FIT10
    const requestedCouponCode = req.query.couponCode;

    if (requestedCouponCode) {
      const cartItems = cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      }));

      const couponResult = await validateCouponForUser({
        code: requestedCouponCode,
        userId: req.user.userId,
        cartItems,
      });

      if (!couponResult.valid) {
        return res.status(400).json({
          message: couponResult.message,
        });
      }

      discount = couponResult.discount;
      couponCode = couponResult.coupon.code;

      couponDetails = {
        code: couponResult.coupon.code,
        description: couponResult.coupon.description,
        discountType: couponResult.coupon.discountType,
        discountValue: couponResult.coupon.discountValue,
      };
    }

    const totalAmount = Number((subtotal + shippingFee - discount).toFixed(2));

    res.status(200).json({
      message: "Checkout preview generated successfully",
      subtotal,
      shippingFee,
      discount,
      couponCode,
      coupon: couponDetails,
      totalAmount,
      items: cart.items,
    });
  } catch (error) {
    console.error("Checkout preview error:", error.message);

    res.status(500).json({
      message: "Server error while generating checkout preview",
    });
  }
};

// Place order
const placeOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, notes, couponCode } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({
        message: "Shipping address is required",
      });
    }

    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    } = shippingAddress;

    if (
      !fullName ||
      !phone ||
      !addressLine1 ||
      !city ||
      !state ||
      !postalCode
    ) {
      return res.status(400).json({
        message:
          "Full name, phone, address, city, state and postal code are required",
      });
    }

    const allowedPaymentMethods = ["upi", "card", "net_banking", "cod"];

    if (!paymentMethod) {
      return res.status(400).json({
        message: "Payment method is required",
      });
    }

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    const cart = await Cart.findOne({
      user: req.user.userId,
    }).populate(
      "items.product",
      "name sku price discountPrice stockQuantity isActive",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    let subtotal = 0;
    const orderItems = [];

    // Validate products and stock before creating the order
    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return res.status(400).json({
          message: "One or more products in your cart are unavailable",
        });
      }

      if (item.quantity > product.stockQuantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
          availableStock: product.stockQuantity,
        });
      }

      const currentPrice =
        product.discountPrice !== null && product.discountPrice !== undefined
          ? product.discountPrice
          : product.price;

      const itemTotal = currentPrice * item.quantity;

      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: currentPrice,
        totalPrice: itemTotal,
      });
    }

    const shippingFee = subtotal >= 2000 ? 0 : 100;

    let discount = 0;
    let appliedCouponCode = null;

    // Validate coupon again while placing the order.
    // This prevents expired, inactive, or already-used
    // coupons from being applied.
    if (couponCode) {
      const cartItems = cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      }));

      const couponResult = await validateCouponForUser({
        code: couponCode,
        userId: req.user.userId,
        cartItems,
      });

      if (!couponResult.valid) {
        return res.status(400).json({
          message: couponResult.message,
        });
      }

      discount = couponResult.discount;
      appliedCouponCode = couponResult.coupon.code;
    }

    const totalAmount = Number((subtotal + shippingFee - discount).toFixed(2));

    // Deduct stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);

      if (!product || !product.isActive) {
        return res.status(400).json({
          message: "Product became unavailable while placing the order",
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
          availableStock: product.stockQuantity,
        });
      }

      product.stockQuantity -= item.quantity;

      await product.save();
    }

    let paymentStatus = "pending";
    let transactionId = null;

    // Simulated payment behavior for the first version
    if (paymentMethod !== "cod") {
      paymentStatus = "paid";
      transactionId = `SIM-${Date.now()}`;
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user.userId,

      items: orderItems,

      shippingAddress: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2 ? addressLine2.trim() : "",
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country ? country.trim() : "India",
      },

      subtotal,
      shippingFee,
      discount,
      couponCode: appliedCouponCode,
      totalAmount,

      paymentMethod,
      paymentStatus,
      transactionId,

      orderStatus: "placed",

      notes: notes ? notes.trim() : "",
    });

    // Clear cart after successful order creation
    cart.items = [];

    await cart.save();

    const populatedOrder = await Order.findById(order._id).populate(
      "items.product",
      "name slug sku brand images",
    );

    res.status(201).json({
      message: "Order placed successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Place order error:", error.message);

    res.status(500).json({
      message: "Server error while placing order",
    });
  }
};

// Get current user's orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.userId,
    })
      .populate("items.product", "name slug sku brand images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Orders retrieved successfully",
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving orders",
    });
  }
};

// Get single order belonging to current user
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("items.product", "name slug sku brand images");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  } catch (error) {
    console.error("Get order error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving order",
    });
  }
};

module.exports = {
  getCheckoutPreview,
  placeOrder,
  getMyOrders,
  getOrderById,
};
