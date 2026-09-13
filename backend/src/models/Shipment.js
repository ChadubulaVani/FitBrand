const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    courierName: {
      type: String,
      trim: true,
      default: "",
    },

    awbNumber: {
      type: String,
      trim: true,
      default: "",
    },

    trackingNumber: {
      type: String,
      trim: true,
      default: "",
    },

    shippingAddress: {
      name: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      addressLine1: {
        type: String,
        trim: true,
        default: "",
      },
      addressLine2: {
        type: String,
        trim: true,
        default: "",
      },
      city: {
        type: String,
        trim: true,
        default: "",
      },
      state: {
        type: String,
        trim: true,
        default: "",
      },
      postalCode: {
        type: String,
        trim: true,
        default: "",
      },
      country: {
        type: String,
        trim: true,
        default: "India",
      },
    },

    status: {
      type: String,
      enum: [
        "created",
        "processing",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "created",
    },

    shippedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    returnRequestedAt: {
      type: Date,
      default: null,
    },

    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Shipment", shipmentSchema);
