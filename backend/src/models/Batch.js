const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 100,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    manufacturingDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    labName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    coaUrl: {
      type: String,
      trim: true,
      default: "",
    },

    testStatus: {
      type: String,
      enum: ["pending", "passed", "failed"],
      default: "pending",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Batch", batchSchema);
