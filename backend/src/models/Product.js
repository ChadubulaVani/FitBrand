const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "FITBRAND",
    },

    brandOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    images: [
      {
        type: String,
        trim: true,
      },
    ],

    flavors: [
      {
        type: String,
        trim: true,
      },
    ],

    servings: {
      type: Number,
      min: 1,
      default: null,
    },

    servingSize: {
      type: String,
      trim: true,
      default: "",
    },

    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],

    supplementFacts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Product", productSchema);
