const mongoose = require("mongoose");

const complianceSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },

    complianceStatus: {
      type: String,
      enum: ["pending", "compliant", "non_compliant", "expired"],
      default: "pending",
    },

    coaStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    certification: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Compliance", complianceSchema);
