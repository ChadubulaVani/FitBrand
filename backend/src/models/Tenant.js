const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },

    logo: {
      type: String,
      trim: true,
      default: "",
    },

    primaryColor: {
      type: String,
      trim: true,
      default: "#0d6efd",
    },

    secondaryColor: {
      type: String,
      trim: true,
      default: "#212529",
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

module.exports = mongoose.model("Tenant", tenantSchema);
