const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },

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

    type: {
      type: String,
      enum: [
        "restock",
        "sale",
        "adjustment",
        "return",
        "damage",
        "expired",
        "reservation",
        "release",
      ],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);
