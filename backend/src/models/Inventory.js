const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },

    totalStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    reservedStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },

    lastRestockedAt: {
      type: Date,
      default: null,
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

inventorySchema.virtual("availableStock").get(function () {
  return Math.max(this.totalStock - this.reservedStock, 0);
});

inventorySchema.set("toJSON", {
  virtuals: true,
});

inventorySchema.set("toObject", {
  virtuals: true,
});

module.exports = mongoose.model("Inventory", inventorySchema);
