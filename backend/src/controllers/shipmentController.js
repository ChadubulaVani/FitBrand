const Shipment = require("../models/Shipment");
const TrackingEvent = require("../models/TrackingEvent");
const Order = require("../models/Order");
const Product = require("../models/Product");

const generateShipmentNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `SHP-${timestamp}-${random}`;
};

const generateTrackingNumber = () => {
  const timestamp = Date.now().toString().slice(-9);
  const random = Math.floor(100 + Math.random() * 900);

  return `FBTRK${timestamp}${random}`;
};

// ============================================================
// Phase 11 helper
//
// Determines whether a shipment belongs entirely to the
// currently authenticated brand owner.
//
// Admin and operations retain global access.
// ============================================================
const ensureShipmentOwnership = async (shipment, req, res, options = {}) => {
  const { writeOperation = false } = options;

  if (!shipment) {
    res.status(404).json({
      message: "Shipment not found",
    });

    return false;
  }

  // Admin and operations retain global access.
  if (req.user.role === "admin" || req.user.role === "operations") {
    return true;
  }

  // Customer ownership is handled by the existing
  // customer-specific checks.
  if (req.user.role === "customer") {
    if (
      shipment.user &&
      shipment.user.toString() === req.user.userId.toString()
    ) {
      return true;
    }

    res.status(403).json({
      message: "Access denied",
    });

    return false;
  }

  // Brand owner access.
  if (req.user.role === "brand_owner") {
    const order = await Order.findById(shipment.order).populate({
      path: "items.product",
      select: "brandOwner",
    });

    if (!order) {
      res.status(404).json({
        message: "Associated order not found",
      });

      return false;
    }

    if (!order.items || order.items.length === 0) {
      res.status(403).json({
        message: "You are not authorized to access this shipment",
      });

      return false;
    }

    const allItemsOwnedByMerchant = order.items.every((item) => {
      if (!item.product) {
        return false;
      }

      return (
        item.product.brandOwner &&
        item.product.brandOwner.toString() === req.user.userId.toString()
      );
    });

    if (allItemsOwnedByMerchant) {
      return true;
    }

    // A merchant cannot modify a shipment containing
    // another merchant's products.
    if (writeOperation) {
      res.status(403).json({
        message:
          "You cannot modify a shipment containing products from another merchant",
      });

      return false;
    }

    res.status(403).json({
      message: "You are not authorized to access this shipment",
    });

    return false;
  }

  res.status(403).json({
    message: "Access denied",
  });

  return false;
};

// Create shipment for an existing order
const createShipment = async (req, res) => {
  try {
    const { orderId, courierName, estimatedDeliveryDate, notes } = req.body;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const order = await Order.findById(orderId).populate({
      path: "items.product",
      select: "brandOwner",
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // ========================================================
    // Phase 11:
    // Brand owners may create shipments only for orders
    // whose products all belong to that merchant.
    // ========================================================
    if (req.user.role === "brand_owner") {
      if (!order.items || order.items.length === 0) {
        return res.status(403).json({
          message: "You are not authorized to create a shipment for this order",
        });
      }

      const allItemsOwnedByMerchant = order.items.every((item) => {
        if (!item.product) {
          return false;
        }

        return (
          item.product.brandOwner &&
          item.product.brandOwner.toString() === req.user.userId.toString()
        );
      });

      if (!allItemsOwnedByMerchant) {
        return res.status(403).json({
          message:
            "You cannot create a shipment for an order containing products from another merchant",
        });
      }
    }

    const existingShipment = await Shipment.findOne({
      order: orderId,
    });

    if (existingShipment) {
      return res.status(400).json({
        message: "Shipment already exists for this order",
        shipment: existingShipment,
      });
    }

    const shipment = await Shipment.create({
      shipmentNumber: generateShipmentNumber(),
      order: order._id,
      user: order.user,
      courierName: courierName || "",
      estimatedDeliveryDate: estimatedDeliveryDate || null,
      shippingAddress: order.shippingAddress,
      status: "created",
      notes: notes || "",
    });

    await TrackingEvent.create({
      shipment: shipment._id,
      status: "created",
      location: shipment.shippingAddress.city || "",
      description: "Shipment created successfully",
    });

    order.orderStatus = "processing";
    await order.save();

    const populatedShipment = await Shipment.findById(shipment._id)
      .populate("order")
      .populate("user");

    return res.status(201).json({
      message: "Shipment created successfully",
      shipment: populatedShipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create shipment",
      error: error.message,
    });
  }
};

// Get shipment by ID
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate("order")
      .populate("user");

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    if (req.user.role === "customer") {
      if (
        !shipment.user ||
        shipment.user._id.toString() !== req.user.userId.toString()
      ) {
        return res.status(403).json({
          message: "Access denied",
        });
      }
    }

    // ========================================================
    // Phase 11 merchant ownership protection
    // ========================================================
    if (
      req.user.role === "brand_owner" &&
      !(await ensureShipmentOwnership(shipment, req, res))
    ) {
      return;
    }

    return res.json({
      message: "Shipment retrieved successfully",
      shipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve shipment",
      error: error.message,
    });
  }
};

// Get customer's shipments
const getMyShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({
      user: req.user.userId,
    })
      .populate("order")
      .sort({ createdAt: -1 });

    return res.json({
      message: "Customer shipments retrieved successfully",
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve customer shipments",
      error: error.message,
    });
  }
};

// Get all shipments for management
const getAllShipments = async (req, res) => {
  try {
    // ========================================================
    // Phase 11:
    // Admin and operations keep the original global view.
    //
    // Brand owners receive only shipments where every order
    // item belongs to them.
    // ========================================================
    let shipments;

    if (req.user.role === "brand_owner") {
      const ownedProducts = await Product.find({
        brandOwner: req.user.userId,
      }).select("_id");

      const ownedProductIds = ownedProducts.map((product) => product._id);

      const orders = await Order.find({
        "items.product": {
          $in: ownedProductIds,
        },
      }).select("_id items.product");

      const fullyOwnedOrderIds = orders
        .filter((order) => {
          if (!order.items || order.items.length === 0) {
            return false;
          }

          return order.items.every((item) =>
            ownedProductIds.some(
              (productId) => productId.toString() === item.product.toString(),
            ),
          );
        })
        .map((order) => order._id);

      shipments = await Shipment.find({
        order: {
          $in: fullyOwnedOrderIds,
        },
      })
        .populate("order")
        .populate("user", "name email phone role")
        .sort({ createdAt: -1 });
    } else {
      shipments = await Shipment.find()
        .populate("order")
        .populate("user", "name email phone role")
        .sort({ createdAt: -1 });
    }

    return res.json({
      message: "All shipments retrieved successfully",
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve shipments",
      error: error.message,
    });
  }
};

// Assign courier and generate tracking information
const assignCourier = async (req, res) => {
  try {
    const { courierName } = req.body;

    if (!courierName) {
      return res.status(400).json({
        message: "Courier name is required",
      });
    }

    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    // ========================================================
    // Phase 11 merchant ownership protection
    // ========================================================
    if (
      req.user.role === "brand_owner" &&
      !(await ensureShipmentOwnership(shipment, req, res, {
        writeOperation: true,
      }))
    ) {
      return;
    }

    shipment.courierName = courierName;

    if (!shipment.awbNumber) {
      shipment.awbNumber = generateTrackingNumber();
    }

    if (!shipment.trackingNumber) {
      shipment.trackingNumber = shipment.awbNumber;
    }

    if (shipment.status === "created") {
      shipment.status = "processing";
    }

    await shipment.save();

    await TrackingEvent.create({
      shipment: shipment._id,
      status: shipment.status,
      location: shipment.shippingAddress.city || "",
      description: `Courier assigned: ${courierName}`,
    });

    return res.json({
      message: "Courier assigned successfully",
      shipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to assign courier",
      error: error.message,
    });
  }
};

// Update shipment status
const updateShipmentStatus = async (req, res) => {
  try {
    const { status, location, description } = req.body;

    const allowedStatuses = [
      "created",
      "processing",
      "shipped",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "returned",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Valid shipment status is required",
      });
    }

    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    // ========================================================
    // Phase 11 merchant ownership protection
    // ========================================================
    if (
      req.user.role === "brand_owner" &&
      !(await ensureShipmentOwnership(shipment, req, res, {
        writeOperation: true,
      }))
    ) {
      return;
    }

    shipment.status = status;

    if (status === "shipped" && !shipment.shippedAt) {
      shipment.shippedAt = new Date();
    }

    if (status === "delivered") {
      shipment.deliveredAt = new Date();
    }

    if (status === "cancelled") {
      shipment.cancelledAt = new Date();
    }

    if (status === "returned" && !shipment.returnRequestedAt) {
      shipment.returnRequestedAt = new Date();
    }

    await shipment.save();

    await TrackingEvent.create({
      shipment: shipment._id,
      status,
      location: location || "",
      description: description || `Shipment status updated to ${status}`,
    });

    const order = await Order.findById(shipment.order);

    if (order) {
      const orderStatusMap = {
        created: "placed",
        processing: "processing",
        shipped: "shipped",
        in_transit: "shipped",
        out_for_delivery: "out_for_delivery",
        delivered: "delivered",
        cancelled: "cancelled",
        returned: "returned",
      };

      if (orderStatusMap[status]) {
        order.orderStatus = orderStatusMap[status];

        await order.save();
      }
    }

    return res.json({
      message: "Shipment status updated successfully",
      shipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update shipment status",
      error: error.message,
    });
  }
};

// Cancel shipment
const cancelShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    // ========================================================
    // Phase 11 merchant ownership protection
    // ========================================================
    if (
      req.user.role === "brand_owner" &&
      !(await ensureShipmentOwnership(shipment, req, res, {
        writeOperation: true,
      }))
    ) {
      return;
    }

    if (
      shipment.status === "delivered" ||
      shipment.status === "cancelled" ||
      shipment.status === "returned"
    ) {
      return res.status(400).json({
        message: `Shipment cannot be cancelled when status is ${shipment.status}`,
      });
    }

    shipment.status = "cancelled";
    shipment.cancelledAt = new Date();

    await shipment.save();

    await TrackingEvent.create({
      shipment: shipment._id,
      status: "cancelled",
      location: shipment.shippingAddress.city || "",
      description: "Shipment cancelled",
    });

    const order = await Order.findById(shipment.order);

    if (order) {
      order.orderStatus = "cancelled";
      await order.save();
    }

    return res.json({
      message: "Shipment cancelled successfully",
      shipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to cancel shipment",
      error: error.message,
    });
  }
};

// Mark shipment as returned
const returnShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    // ========================================================
    // Phase 11 merchant ownership protection
    // ========================================================
    if (
      req.user.role === "brand_owner" &&
      !(await ensureShipmentOwnership(shipment, req, res, {
        writeOperation: true,
      }))
    ) {
      return;
    }

    if (shipment.status !== "delivered") {
      return res.status(400).json({
        message: "Only delivered shipments can be returned",
      });
    }

    shipment.status = "returned";
    shipment.returnRequestedAt = new Date();

    await shipment.save();

    await TrackingEvent.create({
      shipment: shipment._id,
      status: "returned",
      location: shipment.shippingAddress.city || "",
      description: "Shipment return requested",
    });

    const order = await Order.findById(shipment.order);

    if (order) {
      order.orderStatus = "returned";
      await order.save();
    }

    return res.json({
      message: "Shipment return requested successfully",
      shipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to return shipment",
      error: error.message,
    });
  }
};

module.exports = {
  createShipment,
  getShipmentById,
  getMyShipments,
  getAllShipments,
  assignCourier,
  updateShipmentStatus,
  cancelShipment,
  returnShipment,
};
