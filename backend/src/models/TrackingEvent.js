const mongoose = require("mongoose");

const trackingEventSchema = new mongoose.Schema(
  {
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
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
      required: true,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    eventTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

trackingEventSchema.index({
  shipment: 1,
  eventTime: -1,
});

module.exports = mongoose.model("TrackingEvent", trackingEventSchema);
