const Bundle = require("../models/Bundle");
const Product = require("../models/Product");

const validateBundleItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      message: "Bundle must contain at least one product",
    };
  }

  for (const item of items) {
    if (!item.product) {
      return {
        valid: false,
        message: "Product ID is required",
      };
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return {
        valid: false,
        message: "Bundle product quantity must be at least 1",
      };
    }

    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      return {
        valid: false,
        message: `Product ${item.product} is not available`,
      };
    }
  }

  return {
    valid: true,
  };
};

const calculateOriginalPrice = async (items) => {
  let total = 0;

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      continue;
    }

    const unitPrice =
      product.discountPrice !== null && product.discountPrice !== undefined
        ? product.discountPrice
        : product.price;

    total += unitPrice * item.quantity;
  }

  return Number(total.toFixed(2));
};

// =========================
// CUSTOMER / STORE APIs
// =========================

const getBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find({
      isActive: true,
    })
      .populate(
        "items.product",
        "name sku price discountPrice images stockQuantity",
      )
      .sort({ createdAt: -1 });

    const bundlesWithAvailability = bundles.map((bundle) => {
      const available = bundle.items.every(
        (item) => item.product && item.product.stockQuantity >= item.quantity,
      );

      return {
        ...bundle.toObject(),
        available,
      };
    });

    res.status(200).json({
      message: "Bundles retrieved successfully",
      count: bundlesWithAvailability.length,
      bundles: bundlesWithAvailability,
    });
  } catch (error) {
    console.error("Get bundles error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving bundles",
    });
  }
};

const getBundleById = async (req, res) => {
  try {
    const bundle = await Bundle.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate(
      "items.product",
      "name sku price discountPrice images stockQuantity",
    );

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    const available = bundle.items.every(
      (item) => item.product && item.product.stockQuantity >= item.quantity,
    );

    res.status(200).json({
      message: "Bundle retrieved successfully",
      bundle: {
        ...bundle.toObject(),
        available,
      },
    });
  } catch (error) {
    console.error("Get bundle error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving bundle",
    });
  }
};

// =========================
// MANAGER APIs
// =========================

const createBundle = async (req, res) => {
  try {
    const { name, slug, description, items, bundlePrice, image } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Bundle name is required",
      });
    }

    if (!slug) {
      return res.status(400).json({
        message: "Bundle slug is required",
      });
    }

    if (
      bundlePrice === undefined ||
      bundlePrice === null ||
      Number(bundlePrice) < 0
    ) {
      return res.status(400).json({
        message: "Valid bundle price is required",
      });
    }

    const existingBundle = await Bundle.findOne({
      slug: slug.trim().toLowerCase(),
    });

    if (existingBundle) {
      return res.status(409).json({
        message: "Bundle slug already exists",
      });
    }

    const itemValidation = await validateBundleItems(items);

    if (!itemValidation.valid) {
      return res.status(400).json({
        message: itemValidation.message,
      });
    }

    const originalPrice = await calculateOriginalPrice(items);

    const discount = Number(
      Math.max(originalPrice - Number(bundlePrice), 0).toFixed(2),
    );

    const bundle = await Bundle.create({
      name,
      slug: slug.trim().toLowerCase(),
      description: description || "",
      items,
      bundlePrice,
      discount,
      image: image || "",
      isActive: true,
    });

    const populatedBundle = await Bundle.findById(bundle._id).populate(
      "items.product",
      "name sku price discountPrice images stockQuantity",
    );

    res.status(201).json({
      message: "Bundle created successfully",
      bundle: populatedBundle,
      originalPrice,
      discount,
    });
  } catch (error) {
    console.error("Create bundle error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bundle slug already exists",
      });
    }

    res.status(400).json({
      message: error.message || "Unable to create bundle",
    });
  }
};

const getAllBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find()
      .populate(
        "items.product",
        "name sku price discountPrice images stockQuantity",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All bundles retrieved successfully",
      count: bundles.length,
      bundles,
    });
  } catch (error) {
    console.error("Get all bundles error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving bundles",
    });
  }
};

const updateBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findById(req.params.id);

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "items",
      "bundlePrice",
      "image",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        bundle[field] = req.body[field];
      }
    }

    if (bundle.bundlePrice < 0) {
      return res.status(400).json({
        message: "Bundle price cannot be negative",
      });
    }

    if (req.body.items !== undefined) {
      const itemValidation = await validateBundleItems(bundle.items);

      if (!itemValidation.valid) {
        return res.status(400).json({
          message: itemValidation.message,
        });
      }
    }

    const originalPrice = await calculateOriginalPrice(bundle.items);

    bundle.discount = Number(
      Math.max(originalPrice - bundle.bundlePrice, 0).toFixed(2),
    );

    await bundle.save();

    const updatedBundle = await Bundle.findById(bundle._id).populate(
      "items.product",
      "name sku price discountPrice images stockQuantity",
    );

    res.status(200).json({
      message: "Bundle updated successfully",
      bundle: updatedBundle,
      originalPrice,
      discount: bundle.discount,
    });
  } catch (error) {
    console.error("Update bundle error:", error.message);

    res.status(400).json({
      message: error.message || "Unable to update bundle",
    });
  }
};

const deleteBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findById(req.params.id);

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    bundle.isActive = false;

    await bundle.save();

    res.status(200).json({
      message: "Bundle deactivated successfully",
      bundle,
    });
  } catch (error) {
    console.error("Delete bundle error:", error.message);

    res.status(500).json({
      message: "Server error while deactivating bundle",
    });
  }
};

const getBundlePricing = async (req, res) => {
  try {
    const bundle = await Bundle.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("items.product", "name sku price discountPrice stockQuantity");

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    const originalPrice = await calculateOriginalPrice(bundle.items);

    const savings = Number(
      Math.max(originalPrice - bundle.bundlePrice, 0).toFixed(2),
    );

    const available = bundle.items.every(
      (item) => item.product && item.product.stockQuantity >= item.quantity,
    );

    res.status(200).json({
      message: "Bundle pricing retrieved successfully",

      bundle: {
        id: bundle._id,
        name: bundle.name,
        slug: bundle.slug,
        bundlePrice: bundle.bundlePrice,
        originalPrice,
        savings,
        available,
        items: bundle.items,
      },
    });
  } catch (error) {
    console.error("Get bundle pricing error:", error.message);

    res.status(500).json({
      message: "Server error while calculating bundle pricing",
    });
  }
};

const checkBundleAvailability = async (req, res) => {
  try {
    const bundle = await Bundle.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("items.product", "name sku stockQuantity");

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    const unavailableItems = [];

    for (const item of bundle.items) {
      if (!item.product || item.product.stockQuantity < item.quantity) {
        unavailableItems.push({
          product: item.product?.name || "Unknown product",
          requiredQuantity: item.quantity,
          availableQuantity: item.product?.stockQuantity || 0,
        });
      }
    }

    res.status(200).json({
      message:
        unavailableItems.length === 0
          ? "Bundle is available"
          : "Bundle has unavailable products",

      available: unavailableItems.length === 0,

      unavailableItems,
    });
  } catch (error) {
    console.error("Check bundle availability error:", error.message);

    res.status(500).json({
      message: "Server error while checking bundle availability",
    });
  }
};

module.exports = {
  getBundles,
  getBundleById,
  getBundlePricing,
  checkBundleAvailability,
  createBundle,
  getAllBundles,
  updateBundle,
  deleteBundle,
};
