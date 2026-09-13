const Product = require("../models/Product");
const Category = require("../models/Category");
const Inventory = require("../models/Inventory");
const Order = require("../models/Order");
const Shipment = require("../models/Shipment");

// ==================================================
// Helper
// ==================================================

const getOwnerFilter = (req) => {
  if (req.user.role === "admin") {
    return {};
  }

  return {
    brandOwner: req.user.userId,
  };
};

// ==================================================
// Brand Owner Dashboard
// ==================================================

const getBrandDashboard = async (req, res) => {
  try {
    const productFilter = getOwnerFilter(req);

    const products = await Product.find(productFilter);

    const productIds = products.map((product) => product._id);

    const inventory = await Inventory.find({
      product: { $in: productIds },
      isActive: true,
    });

    const orders = await Order.find({
      "items.product": { $in: productIds },
    });

    let totalRevenue = 0;
    let totalUnitsSold = 0;

    for (const order of orders) {
      for (const item of order.items) {
        if (
          productIds.some((id) => id.toString() === item.product.toString())
        ) {
          totalRevenue += item.totalPrice;
          totalUnitsSold += item.quantity;
        }
      }
    }

    const activeProducts = products.filter(
      (product) => product.isActive,
    ).length;

    const lowStockProducts = inventory.filter(
      (item) => item.availableStock <= item.lowStockThreshold,
    ).length;

    const activeOrders = orders.filter(
      (order) => !["cancelled", "returned"].includes(order.orderStatus),
    ).length;

    return res.status(200).json({
      message: "Brand dashboard retrieved successfully",

      dashboard: {
        totalProducts: products.length,
        activeProducts,
        totalInventoryItems: inventory.length,
        lowStockProducts,
        totalOrders: orders.length,
        activeOrders,
        totalUnitsSold,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Brand dashboard error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand dashboard",
    });
  }
};

// ==================================================
// Get Brand Owner Products
// ==================================================

const getMyProducts = async (req, res) => {
  try {
    const filter = getOwnerFilter(req);

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .populate("brandOwner", "name email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Brand products retrieved successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get brand products error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand products",
    });
  }
};

// ==================================================
// Create Brand Product
// ==================================================

const createBrandProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      sku,
      brand,
      category,
      description,
      price,
      discountPrice,
      images,
      flavors,
      servings,
      servingSize,
      ingredients,
      supplementFacts,
      stockQuantity,
      isFeatured,
      isActive,
    } = req.body;

    if (
      !name ||
      !slug ||
      !sku ||
      !category ||
      !description ||
      price === undefined
    ) {
      return res.status(400).json({
        message:
          "Name, slug, SKU, category, description and price are required",
      });
    }

    const categoryExists = await Category.findOne({
      _id: category,
      isActive: true,
    });

    if (!categoryExists) {
      return res.status(400).json({
        message: "Valid active category is required",
      });
    }

    const existingProduct = await Product.findOne({
      $or: [
        {
          slug: slug.toLowerCase().trim(),
        },
        {
          sku: sku.toUpperCase().trim(),
        },
      ],
    });

    if (existingProduct) {
      return res.status(409).json({
        message: "Product with this slug or SKU already exists",
      });
    }

    if (
      discountPrice !== null &&
      discountPrice !== undefined &&
      Number(discountPrice) > Number(price)
    ) {
      return res.status(400).json({
        message: "Discount price cannot be greater than regular price",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      sku: sku.toUpperCase().trim(),
      brand: brand ? brand.trim() : "FITBRAND",

      brandOwner: req.user.role === "brand_owner" ? req.user.userId : null,

      category,
      description: description.trim(),
      price,

      discountPrice: discountPrice !== undefined ? discountPrice : null,

      images: images || [],
      flavors: flavors || [],

      servings: servings !== undefined ? servings : null,

      servingSize: servingSize || "",

      ingredients: ingredients || [],

      supplementFacts: supplementFacts || {},

      stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,

      isFeatured: isFeatured !== undefined ? isFeatured : false,

      isActive: isActive !== undefined ? isActive : true,
    });

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate("brandOwner", "name email role");

    return res.status(201).json({
      message: "Brand product created successfully",
      product: populatedProduct,
    });
  } catch (error) {
    console.error("Create brand product error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Product slug or SKU already exists",
      });
    }

    return res.status(500).json({
      message: "Server error while creating brand product",
    });
  }
};

// ==================================================
// Get Own Product
// ==================================================

const getMyProductById = async (req, res) => {
  try {
    const filter = {
      _id: req.params.id,
      ...getOwnerFilter(req),
    };

    const product = await Product.findOne(filter)
      .populate("category", "name slug")
      .populate("brandOwner", "name email phone role");

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you do not have access to it",
      });
    }

    return res.status(200).json({
      message: "Brand product retrieved successfully",
      product,
    });
  } catch (error) {
    console.error("Get brand product error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand product",
    });
  }
};

// ==================================================
// Update Own Product
// ==================================================

const updateMyProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...getOwnerFilter(req),
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you do not have access to it",
      });
    }

    const {
      name,
      slug,
      sku,
      brand,
      category,
      description,
      price,
      discountPrice,
      images,
      flavors,
      servings,
      servingSize,
      ingredients,
      supplementFacts,
      isFeatured,
      isActive,
    } = req.body;

    if (category !== undefined) {
      const categoryExists = await Category.findOne({
        _id: category,
        isActive: true,
      });

      if (!categoryExists) {
        return res.status(400).json({
          message: "Valid active category is required",
        });
      }

      product.category = category;
    }

    if (name !== undefined) {
      product.name = name.trim();
    }

    if (slug !== undefined) {
      product.slug = slug.toLowerCase().trim();
    }

    if (sku !== undefined) {
      product.sku = sku.toUpperCase().trim();
    }

    if (brand !== undefined) {
      product.brand = brand.trim();
    }

    if (description !== undefined) {
      product.description = description.trim();
    }

    if (price !== undefined) {
      product.price = Number(price);
    }

    if (discountPrice !== undefined) {
      if (
        discountPrice !== null &&
        Number(discountPrice) >
          Number(price !== undefined ? price : product.price)
      ) {
        return res.status(400).json({
          message: "Discount price cannot be greater than regular price",
        });
      }

      product.discountPrice = discountPrice;
    }

    if (images !== undefined) {
      product.images = images;
    }

    if (flavors !== undefined) {
      product.flavors = flavors;
    }

    if (servings !== undefined) {
      product.servings = servings;
    }

    if (servingSize !== undefined) {
      product.servingSize = servingSize;
    }

    if (ingredients !== undefined) {
      product.ingredients = ingredients;
    }

    if (supplementFacts !== undefined) {
      product.supplementFacts = supplementFacts;
    }

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured;
    }

    if (isActive !== undefined) {
      product.isActive = isActive;
    }

    await product.save();

    const updatedProduct = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate("brandOwner", "name email role");

    return res.status(200).json({
      message: "Brand product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update brand product error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Product slug or SKU already exists",
      });
    }

    return res.status(500).json({
      message: "Server error while updating brand product",
    });
  }
};

// ==================================================
// Deactivate Own Product
// ==================================================

const deactivateMyProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...getOwnerFilter(req),
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you do not have access to it",
      });
    }

    product.isActive = false;

    await product.save();

    return res.status(200).json({
      message: "Brand product deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate brand product error:", error.message);

    return res.status(500).json({
      message: "Server error while deactivating brand product",
    });
  }
};

// ==================================================
// Inventory Overview
// ==================================================

const getMyInventory = async (req, res) => {
  try {
    const products = await Product.find(getOwnerFilter(req)).select("_id");

    const productIds = products.map((product) => product._id);

    const inventory = await Inventory.find({
      product: {
        $in: productIds,
      },
      isActive: true,
    })
      .populate("product", "name slug sku brand stockQuantity isActive")
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Brand inventory retrieved successfully",
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error("Get brand inventory error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand inventory",
    });
  }
};

// ==================================================
// Low Stock
// ==================================================

const getMyLowStock = async (req, res) => {
  try {
    const products = await Product.find(getOwnerFilter(req)).select("_id");

    const productIds = products.map((product) => product._id);

    const inventory = await Inventory.find({
      product: {
        $in: productIds,
      },
      isActive: true,
    }).populate("product", "name slug sku brand stockQuantity");

    const lowStock = inventory.filter(
      (item) => item.availableStock <= item.lowStockThreshold,
    );

    return res.status(200).json({
      message: "Brand low-stock inventory retrieved successfully",
      count: lowStock.length,
      inventory: lowStock,
    });
  } catch (error) {
    console.error("Brand low-stock error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand low-stock inventory",
    });
  }
};

// ==================================================
// Brand Orders
// ==================================================

const getMyOrders = async (req, res) => {
  try {
    const products = await Product.find(getOwnerFilter(req)).select("_id");

    const productIds = products.map((product) => product._id);

    const orders = await Order.find({
      "items.product": {
        $in: productIds,
      },
    })
      .populate("user", "name email phone")
      .populate("items.product", "name slug sku brand")
      .sort({ createdAt: -1 });

    const scopedOrders = orders.map((order) => {
      const brandItems = order.items.filter((item) =>
        productIds.some((id) => id.toString() === item.product._id.toString()),
      );

      const brandSubtotal = brandItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customer: order.user,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        brandItems,
        brandSubtotal: Number(brandSubtotal.toFixed(2)),
        createdAt: order.createdAt,
      };
    });

    return res.status(200).json({
      message: "Brand orders retrieved successfully",
      count: scopedOrders.length,
      orders: scopedOrders,
    });
  } catch (error) {
    console.error("Get brand orders error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand orders",
    });
  }
};

// ==================================================
// Brand Shipments
// ==================================================

const getMyShipments = async (req, res) => {
  try {
    const products = await Product.find(getOwnerFilter(req)).select("_id");

    const productIds = products.map((product) => product._id);

    const orders = await Order.find({
      "items.product": {
        $in: productIds,
      },
    }).select("_id");

    const orderIds = orders.map((order) => order._id);

    const shipments = await Shipment.find({
      order: {
        $in: orderIds,
      },
    })
      .populate("order", "orderNumber orderStatus totalAmount")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Brand shipments retrieved successfully",
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    console.error("Get brand shipments error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving brand shipments",
    });
  }
};

module.exports = {
  getBrandDashboard,
  getMyProducts,
  createBrandProduct,
  getMyProductById,
  updateMyProduct,
  deactivateMyProduct,
  getMyInventory,
  getMyLowStock,
  getMyOrders,
  getMyShipments,
};
