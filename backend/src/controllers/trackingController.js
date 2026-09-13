const Shipment = require("../models/Shipment");
const TrackingEvent = require("../models/TrackingEvent");
const Order = require("../models/Order");

const getTrackingHistory = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    if (
      req.user.role === "customer" &&
      shipment.user.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const events = await TrackingEvent.find({
      shipment: shipment._id,
    }).sort({ eventTime: -1 });

    return res.json({
      message: "Tracking history retrieved successfully",
      shipment: {
        id: shipment._id,
        shipmentNumber: shipment.shipmentNumber,
        trackingNumber: shipment.trackingNumber,
        awbNumber: shipment.awbNumber,
        courierName: shipment.courierName,
        status: shipment.status,
      },
      count: events.length,
      events,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve tracking history",
      error: error.message,
    });
  }
};

const getTrackingByNumber = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      $or: [
        { trackingNumber: req.params.trackingNumber },
        { awbNumber: req.params.trackingNumber },
        { shipmentNumber: req.params.trackingNumber },
      ],
    });

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment tracking information not found",
      });
    }

    if (
      req.user.role === "customer" &&
      shipment.user.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const events = await TrackingEvent.find({
      shipment: shipment._id,
    }).sort({ eventTime: -1 });

    return res.json({
      message: "Shipment tracking retrieved successfully",
      shipment: {
        id: shipment._id,
        shipmentNumber: shipment.shipmentNumber,
        trackingNumber: shipment.trackingNumber,
        awbNumber: shipment.awbNumber,
        courierName: shipment.courierName,
        status: shipment.status,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      },
      events,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve shipment tracking",
      error: error.message,
    });
  }
};

const addTrackingEvent = async (req, res) => {
  try {
    const { status, location, description, eventTime } = req.body;

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
        message: "Valid tracking status is required",
      });
    }

    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    const trackingEvent = await TrackingEvent.create({
      shipment: shipment._id,
      status,
      location: location || "",
      description: description || `Shipment status updated to ${status}`,
      eventTime: eventTime || new Date(),
    });

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

    if (status === "returned") {
      shipment.returnRequestedAt = new Date();
    }

    await shipment.save();

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

    return res.status(201).json({
      message: "Tracking event added successfully",
      trackingEvent,
      shipment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add tracking event",
      error: error.message,
    });
  }
};

module.exports = {
  getTrackingHistory,
  getTrackingByNumber,
  addTrackingEvent,
};
