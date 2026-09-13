const mongoose = require("mongoose");

const integrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    type: {
      type: String,
      enum: ["payment", "shipping", "webhook", "analytics", "other"],
      required: true,
    },

    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    environment: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
    },

    apiBaseUrl: {
      type: String,
      trim: true,
      default: "",
    },

    webhookUrl: {
      type: String,
      trim: true,
      default: "",
    },

    isEnabled: {
      type: Boolean,
      default: false,
    },

    description: {
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

module.exports = mongoose.model("Integration", integrationSchema);
