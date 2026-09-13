const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "expired"],
      default: "active",
    },

    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    nextBillingDate: {
      type: Date,
      required: true,
    },

    pausedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    lastBillingDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
