const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // Only used for percentage coupons.
    // Example: 10% with maxDiscount = 500
    maxDiscount: {
      type: Number,
      min: 0,
      default: null,
    },

    minimumOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    usageLimit: {
      type: Number,
      min: 1,
      default: null,
    },

    perUserLimit: {
      type: Number,
      min: 1,
      default: 1,
    },

    // Optional product restrictions.
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Optional category restrictions.
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Basic validation for discount values.
couponSchema.pre("validate", function () {
  if (this.discountType === "percentage") {
    if (this.discountValue <= 0 || this.discountValue > 100) {
      throw new Error(
        "Percentage discount must be greater than 0 and at most 100",
      );
    }

    if (
      this.maxDiscount !== null &&
      this.maxDiscount !== undefined &&
      this.maxDiscount < 0
    ) {
      throw new Error("Maximum discount cannot be negative");
    }
  }

  if (this.discountType === "fixed") {
    if (this.discountValue <= 0) {
      throw new Error("Fixed discount must be greater than 0");
    }

    // Maximum discount does not apply to fixed coupons.
    if (this.maxDiscount !== null && this.maxDiscount !== undefined) {
      this.maxDiscount = null;
    }
  }

  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    throw new Error("End date must be after start date");
  }
});

module.exports = mongoose.model("Coupon", couponSchema);
