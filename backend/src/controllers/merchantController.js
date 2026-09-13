const Product = require("../models/Product");
const Category = require("../models/Category");
const Inventory = require("../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const Order = require("../models/Order");
const Shipment = require("../models/Shipment");

// ============================================================
// Helper: Get products owned by the logged-in brand owner
// ============================================================
const getOwnedProductIds = async (userId) => {
  const products = await Product.find({
    brandOwner: userId,
  }).select("_id");

  return products.map((product) => product._id);
};

// ============================================================
// Helper: Check whether a product belongs to brand owner
// ============================================================
const getOwnedProduct = async (productId, userId) => {
  return Product.findOne({
    _id: productId,
    brandOwner: userId,
  });
};

// ============================================================
// 1. MERCHANT DASHBOARD
// GET /api/merchant/dashboard
// ============================================================
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const ownedProducts = await Product.find({
      brandOwner: userId,
    }).select("_id name isActive");

    const ownedProductIds = ownedProducts.map((product) => product._id);

    const totalProducts = ownedProducts.length;

    const activeProducts = ownedProducts.filter(
      (product) => product.isActive,
    ).length;

    const inactiveProducts = totalProducts - activeProducts;

    // --------------------------------------------------------
    // Inventory statistics
    // --------------------------------------------------------
    const inventories = await Inventory.find({
      product: { $in: ownedProductIds },
    }).populate("product", "name sku brandOwner");

    let lowStockProducts = 0;

    inventories.forEach((inventory) => {
      const availableStock = Math.max(
        inventory.totalStock - inventory.reservedStock,
        0,
      );

      if (availableStock <= inventory.lowStockThreshold) {
        lowStockProducts++;
      }
    });

    // --------------------------------------------------------
    // Order statistics
    // --------------------------------------------------------
    const orders = await Order.find({
      "items.product": { $in: ownedProductIds },
    })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    let pendingOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let returnedOrders = 0;
    let totalRevenue = 0;

    orders.forEach((order) => {
      if (["placed", "confirmed", "processing"].includes(order.orderStatus)) {
        pendingOrders++;
      }

      if (["shipped", "out_for_delivery"].includes(order.orderStatus)) {
        shippedOrders++;
      }

      if (order.orderStatus === "delivered") {
        deliveredOrders++;
      }

      if (order.orderStatus === "returned") {
        returnedOrders++;
      }

      // Revenue is calculated only from this merchant's products.
      // Cancelled and returned orders are excluded.
      if (!["cancelled", "returned"].includes(order.orderStatus)) {
        order.items.forEach((item) => {
          if (
            item.product &&
            ownedProductIds.some(
              (id) => id.toString() === item.product.toString(),
            )
          ) {
            totalRevenue += Number(item.totalPrice || 0);
          }
        });
      }
    });

    // --------------------------------------------------------
    // Recent orders
    // --------------------------------------------------------
    const recentOrders = orders.slice(0, 5).map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      customer: order.user
        ? {
            _id: order.user._id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
    }));

    res.json({
      message: "Merchant dashboard fetched successfully",
      dashboard: {
        products: {
          total: totalProducts,
          active: activeProducts,
          inactive: inactiveProducts,
          lowStock: lowStockProducts,
        },

        orders: {
          total: orders.length,
          pending: pendingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          returned: returnedOrders,
        },

        revenue: {
          total: Number(totalRevenue.toFixed(2)),
        },

        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get merchant dashboard error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant dashboard",
      error: error.message,
    });
  }
};

// ============================================================
// 2. GET MERCHANT PRODUCTS
// GET /api/merchant/products
// ============================================================
const getMerchantProducts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const filter = {
      brandOwner: userId,
    };

    // Optional search
    if (req.query.q) {
      const search = req.query.q.trim();

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Optional active filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    res.json({
      message: "Merchant products fetched successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get merchant products error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant products",
      error: error.message,
    });
  }
};

// ============================================================
// 3. GET SINGLE MERCHANT PRODUCT
// GET /api/merchant/products/:id
// ============================================================
const getMerchantProductById = async (req, res) => {
  try {
    const userId = req.user.userId;

    const product = await Product.findOne({
      _id: req.params.id,
      brandOwner: userId,
    }).populate("category", "name slug description");

    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this brand owner",
      });
    }

    const inventory = await Inventory.findOne({
      product: product._id,
    });

    res.json({
      message: "Merchant product fetched successfully",
      product,
      inventory,
    });
  } catch (error) {
    console.error("Get merchant product error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant product",
      error: error.message,
    });
  }
};

// ============================================================
// 4. CREATE MERCHANT PRODUCT
// POST /api/merchant/products
// ============================================================
const createMerchantProduct = async (req, res) => {
  try {
    const userId = req.user.userId;

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

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------
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
          "name, slug, sku, category, description and price are required",
      });
    }

    // --------------------------------------------------------
    // Validate category
    // --------------------------------------------------------
    const categoryExists = await Category.findOne({
      _id: category,
      isActive: true,
    });

    if (!categoryExists) {
      return res.status(400).json({
        message: "Active category not found",
      });
    }

    // --------------------------------------------------------
    // Validate unique slug
    // --------------------------------------------------------
    const existingSlug = await Product.findOne({
      slug: slug.toLowerCase().trim(),
    });

    if (existingSlug) {
      return res.status(409).json({
        message: "Product slug already exists",
      });
    }

    // --------------------------------------------------------
    // Validate unique SKU
    // --------------------------------------------------------
    const existingSku = await Product.findOne({
      sku: sku.toUpperCase().trim(),
    });

    if (existingSku) {
      return res.status(409).json({
        message: "Product SKU already exists",
      });
    }

    // --------------------------------------------------------
    // Validate discount price
    // --------------------------------------------------------
    if (
      discountPrice !== undefined &&
      discountPrice !== null &&
      Number(discountPrice) > Number(price)
    ) {
      return res.status(400).json({
        message: "Discount price cannot be greater than regular price",
      });
    }

    // --------------------------------------------------------
    // Create product
    // IMPORTANT:
    // brandOwner is assigned from authenticated user.
    // It is NOT accepted from req.body.
    // --------------------------------------------------------
    const product = await Product.create({
      name,
      slug: slug.toLowerCase().trim(),
      sku: sku.toUpperCase().trim(),
      brand: brand || "FITBRAND",
      category,
      description,
      price,
      discountPrice: discountPrice === undefined ? null : discountPrice,
      images: images || [],
      flavors: flavors || [],
      servings: servings === undefined || servings === null ? null : servings,
      servingSize: servingSize || "",
      ingredients: ingredients || [],
      supplementFacts: supplementFacts || {},
      stockQuantity: stockQuantity === undefined ? 0 : stockQuantity,
      isFeatured: isFeatured === undefined ? false : isFeatured,
      isActive: isActive === undefined ? true : isActive,

      // Secure ownership assignment
      brandOwner: userId,
    });

    res.status(201).json({
      message: "Merchant product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create merchant product error:", error);

    res.status(500).json({
      message: "Failed to create merchant product",
      error: error.message,
    });
  }
};

// ============================================================
// 5. UPDATE MERCHANT PRODUCT
// PUT /api/merchant/products/:id
// ============================================================
const updateMerchantProduct = async (req, res) => {
  try {
    const userId = req.user.userId;

    const product = await getOwnedProduct(req.params.id, userId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this brand owner",
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
      stockQuantity,
      isFeatured,
      isActive,
    } = req.body;

    // --------------------------------------------------------
    // Validate category if changed
    // --------------------------------------------------------
    if (category !== undefined) {
      const categoryExists = await Category.findOne({
        _id: category,
        isActive: true,
      });

      if (!categoryExists) {
        return res.status(400).json({
          message: "Active category not found",
        });
      }

      product.category = category;
    }

    // --------------------------------------------------------
    // Validate slug uniqueness
    // --------------------------------------------------------
    if (slug !== undefined) {
      const normalizedSlug = slug.toLowerCase().trim();

      const existingSlug = await Product.findOne({
        slug: normalizedSlug,
        _id: { $ne: product._id },
      });

      if (existingSlug) {
        return res.status(409).json({
          message: "Product slug already exists",
        });
      }

      product.slug = normalizedSlug;
    }

    // --------------------------------------------------------
    // Validate SKU uniqueness
    // --------------------------------------------------------
    if (sku !== undefined) {
      const normalizedSku = sku.toUpperCase().trim();

      const existingSku = await Product.findOne({
        sku: normalizedSku,
        _id: { $ne: product._id },
      });

      if (existingSku) {
        return res.status(409).json({
          message: "Product SKU already exists",
        });
      }

      product.sku = normalizedSku;
    }

    // --------------------------------------------------------
    // Price validation
    // --------------------------------------------------------
    const finalPrice =
      price !== undefined ? Number(price) : Number(product.price);

    const finalDiscountPrice =
      discountPrice !== undefined ? discountPrice : product.discountPrice;

    if (
      finalDiscountPrice !== null &&
      finalDiscountPrice !== undefined &&
      Number(finalDiscountPrice) > finalPrice
    ) {
      return res.status(400).json({
        message: "Discount price cannot be greater than regular price",
      });
    }

    // --------------------------------------------------------
    // Assign allowed fields
    // --------------------------------------------------------
    if (name !== undefined) product.name = name;
    if (brand !== undefined) product.brand = brand;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (discountPrice !== undefined) {
      product.discountPrice = discountPrice;
    }
    if (images !== undefined) product.images = images;
    if (flavors !== undefined) product.flavors = flavors;
    if (servings !== undefined) product.servings = servings;
    if (servingSize !== undefined) {
      product.servingSize = servingSize;
    }
    if (ingredients !== undefined) {
      product.ingredients = ingredients;
    }
    if (supplementFacts !== undefined) {
      product.supplementFacts = supplementFacts;
    }
    if (stockQuantity !== undefined) {
      product.stockQuantity = stockQuantity;
    }
    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured;
    }
    if (isActive !== undefined) {
      product.isActive = isActive;
    }

    await product.save();

    res.json({
      message: "Merchant product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update merchant product error:", error);

    res.status(500).json({
      message: "Failed to update merchant product",
      error: error.message,
    });
  }
};

// ============================================================
// 6. DEACTIVATE MERCHANT PRODUCT
// DELETE /api/merchant/products/:id
// ============================================================
const deleteMerchantProduct = async (req, res) => {
  try {
    const userId = req.user.userId;

    const product = await getOwnedProduct(req.params.id, userId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this brand owner",
      });
    }

    // Soft delete — preserve historical orders/data
    product.isActive = false;

    await product.save();

    res.json({
      message: "Merchant product deactivated successfully",
      product,
    });
  } catch (error) {
    console.error("Delete merchant product error:", error);

    res.status(500).json({
      message: "Failed to deactivate merchant product",
      error: error.message,
    });
  }
};

// ============================================================
// 7. GET MERCHANT INVENTORY
// GET /api/merchant/inventory
// ============================================================
const getMerchantInventory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const products = await Product.find({
      brandOwner: userId,
    }).select("_id name sku brand");

    const productIds = products.map((product) => product._id);

    const inventory = await Inventory.find({
      product: { $in: productIds },
    })
      .populate("product", "name sku brand")
      .populate("batch", "batchNumber");

    const inventoryWithAvailability = inventory.map((item) => ({
      ...item.toObject(),
      availableStock: Math.max(item.totalStock - item.reservedStock, 0),
    }));

    res.json({
      message: "Merchant inventory fetched successfully",
      count: inventoryWithAvailability.length,
      inventory: inventoryWithAvailability,
    });
  } catch (error) {
    console.error("Get merchant inventory error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant inventory",
      error: error.message,
    });
  }
};

// ============================================================
// 8. GET INVENTORY FOR ONE MERCHANT PRODUCT
// GET /api/merchant/inventory/product/:productId
// ============================================================
const getMerchantProductInventory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const product = await getOwnedProduct(req.params.productId, userId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this brand owner",
      });
    }

    const inventory = await Inventory.findOne({
      product: product._id,
    })
      .populate("product", "name sku brand")
      .populate("batch", "batchNumber");

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory record not found for this product",
      });
    }

    res.json({
      message: "Merchant product inventory fetched successfully",
      inventory: {
        ...inventory.toObject(),
        availableStock: Math.max(
          inventory.totalStock - inventory.reservedStock,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Get merchant product inventory error:", error);

    res.status(500).json({
      message: "Failed to fetch product inventory",
      error: error.message,
    });
  }
};

// ============================================================
// 9. ADJUST MERCHANT INVENTORY
// PUT /api/merchant/inventory/:id/adjust
// ============================================================
const adjustMerchantInventory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { quantity, type, reason } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        message: "quantity is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        message: "type is required",
      });
    }

    const allowedTypes = [
      "restock",
      "adjustment",
      "damage",
      "expired",
      "return",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid inventory movement type. Allowed types: ${allowedTypes.join(
          ", ",
        )}`,
      });
    }

    const inventory = await Inventory.findById(req.params.id).populate(
      "product",
      "name sku brandOwner",
    );

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    if (
      !inventory.product ||
      !inventory.product.brandOwner ||
      inventory.product.brandOwner.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to manage this inventory",
      });
    }

    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({
        message: "quantity must be a positive number",
      });
    }

    const previousStock = inventory.totalStock;

    // Restock and return increase stock.
    // Damage and expired stock reduce stock.
    // Adjustment is treated as a positive stock adjustment.
    let stockChange = numericQuantity;

    if (["damage", "expired"].includes(type)) {
      stockChange = -numericQuantity;
    }

    if (type === "adjustment") {
      stockChange = numericQuantity;
    }

    const newStock = previousStock + stockChange;

    if (newStock < 0) {
      return res.status(400).json({
        message: "Inventory stock cannot become negative",
      });
    }

    inventory.totalStock = newStock;
    inventory.lastRestockedAt = ["restock", "return"].includes(type)
      ? new Date()
      : inventory.lastRestockedAt;

    await inventory.save();

    const movement = await InventoryMovement.create({
      inventory: inventory._id,
      product: inventory.product._id,
      batch: inventory.batch || null,
      type,
      quantity: numericQuantity,
      previousStock,
      newStock,
      reason: reason || "",
      performedBy: userId,
    });

    res.json({
      message: "Merchant inventory adjusted successfully",
      inventory: {
        ...inventory.toObject(),
        availableStock: Math.max(
          inventory.totalStock - inventory.reservedStock,
          0,
        ),
      },
      movement,
    });
  } catch (error) {
    console.error("Adjust merchant inventory error:", error);

    res.status(500).json({
      message: "Failed to adjust merchant inventory",
      error: error.message,
    });
  }
};

// ============================================================
// 10. GET MERCHANT INVENTORY MOVEMENTS
// GET /api/merchant/inventory/:id/movements
// ============================================================
const getMerchantInventoryMovements = async (req, res) => {
  try {
    const userId = req.user.userId;

    const inventory = await Inventory.findById(req.params.id).populate(
      "product",
      "name sku brandOwner",
    );

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    if (
      !inventory.product ||
      !inventory.product.brandOwner ||
      inventory.product.brandOwner.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to view these inventory movements",
      });
    }

    const movements = await InventoryMovement.find({
      inventory: inventory._id,
    })
      .populate("product", "name sku")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Merchant inventory movements fetched successfully",
      count: movements.length,
      movements,
    });
  } catch (error) {
    console.error("Get merchant inventory movements error:", error);

    res.status(500).json({
      message: "Failed to fetch inventory movements",
      error: error.message,
    });
  }
};

// ============================================================
// 11. GET MERCHANT LOW-STOCK INVENTORY
// GET /api/merchant/inventory/low-stock
// ============================================================
const getMerchantLowStock = async (req, res) => {
  try {
    const userId = req.user.userId;

    const products = await Product.find({
      brandOwner: userId,
      isActive: true,
    }).select("_id name sku brand");

    const productIds = products.map((product) => product._id);

    const inventory = await Inventory.find({
      product: { $in: productIds },
      isActive: true,
    }).populate("product", "name sku brand");

    const lowStock = inventory.filter((item) => {
      const availableStock = Math.max(item.totalStock - item.reservedStock, 0);

      return availableStock <= item.lowStockThreshold;
    });

    const result = lowStock.map((item) => ({
      ...item.toObject(),
      availableStock: Math.max(item.totalStock - item.reservedStock, 0),
    }));

    res.json({
      message: "Merchant low-stock inventory fetched successfully",
      count: result.length,
      inventory: result,
    });
  } catch (error) {
    console.error("Get merchant low-stock error:", error);

    res.status(500).json({
      message: "Failed to fetch low-stock inventory",
      error: error.message,
    });
  }
};

// ============================================================
// 12. GET MERCHANT ORDERS
// GET /api/merchant/orders
// ============================================================
const getMerchantOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const ownedProductIds = await getOwnedProductIds(userId);

    const orders = await Order.find({
      "items.product": { $in: ownedProductIds },
    })
      .populate("user", "name email phone")
      .populate("items.product", "name sku brand brandOwner")
      .sort({ createdAt: -1 });

    // Only expose this merchant's items inside each order.
    const merchantOrders = orders.map((order) => {
      const merchantItems = order.items.filter(
        (item) =>
          item.product &&
          item.product.brandOwner &&
          item.product.brandOwner.toString() === userId.toString(),
      );

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: merchantItems,
        merchantSubtotal: merchantItems.reduce(
          (sum, item) => sum + Number(item.totalPrice || 0),
          0,
        ),
      };
    });

    res.json({
      message: "Merchant orders fetched successfully",
      count: merchantOrders.length,
      orders: merchantOrders,
    });
  } catch (error) {
    console.error("Get merchant orders error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant orders",
      error: error.message,
    });
  }
};

// ============================================================
// 13. GET SINGLE MERCHANT ORDER
// GET /api/merchant/orders/:id
// ============================================================
const getMerchantOrderById = async (req, res) => {
  try {
    const userId = req.user.userId;

    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name sku brand brandOwner");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const merchantItems = order.items.filter(
      (item) =>
        item.product &&
        item.product.brandOwner &&
        item.product.brandOwner.toString() === userId.toString(),
    );

    if (merchantItems.length === 0) {
      return res.status(403).json({
        message: "You are not authorized to view this order",
      });
    }

    res.json({
      message: "Merchant order fetched successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        transactionId: order.transactionId,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: merchantItems,
        merchantSubtotal: merchantItems.reduce(
          (sum, item) => sum + Number(item.totalPrice || 0),
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Get merchant order error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant order",
      error: error.message,
    });
  }
};

// ============================================================
// 14. UPDATE MERCHANT ORDER STATUS
// PUT /api/merchant/orders/:id/status
// ============================================================
const updateMerchantOrderStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { orderStatus } = req.body;

    const allowedStatuses = [
      "confirmed",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "returned",
    ];

    if (!orderStatus) {
      return res.status(400).json({
        message: "orderStatus is required",
      });
    }

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: `Invalid order status. Allowed statuses: ${allowedStatuses.join(
          ", ",
        )}`,
      });
    }

    const order = await Order.findById(req.params.id).populate(
      "items.product",
      "name sku brandOwner",
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // --------------------------------------------------------
    // Ensure the order contains this merchant's products
    // --------------------------------------------------------
    const merchantItems = order.items.filter(
      (item) =>
        item.product &&
        item.product.brandOwner &&
        item.product.brandOwner.toString() === userId.toString(),
    );

    if (merchantItems.length === 0) {
      return res.status(403).json({
        message: "You are not authorized to update this order",
      });
    }

    // --------------------------------------------------------
    // A merchant must not change the global status of a
    // multi-brand order because that could affect another
    // brand owner's products.
    // --------------------------------------------------------
    const allItemsOwned = order.items.every(
      (item) =>
        item.product &&
        item.product.brandOwner &&
        item.product.brandOwner.toString() === userId.toString(),
    );

    if (!allItemsOwned) {
      return res.status(400).json({
        message:
          "This is a multi-brand order. Order status cannot be changed through the merchant API.",
      });
    }

    order.orderStatus = orderStatus;

    await order.save();

    res.json({
      message: "Merchant order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update merchant order status error:", error);

    res.status(500).json({
      message: "Failed to update merchant order status",
      error: error.message,
    });
  }
};

// ============================================================
// 15. GET MERCHANT SHIPMENTS
// GET /api/merchant/shipments
// ============================================================
const getMerchantShipments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const ownedProductIds = await getOwnedProductIds(userId);

    const orders = await Order.find({
      "items.product": { $in: ownedProductIds },
    }).select("_id");

    const orderIds = orders.map((order) => order._id);

    const shipments = await Shipment.find({
      order: { $in: orderIds },
    })
      .populate("order")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    const merchantShipments = shipments.filter((shipment) => {
      if (!shipment.order || !shipment.order.items) {
        return false;
      }

      if (shipment.order.items.length === 0) {
        return false;
      }

      // Only expose shipments where every product in the
      // associated order belongs to this merchant.
      return shipment.order.items.every(
        (item) =>
          item.product &&
          ownedProductIds.some(
            (id) => id.toString() === item.product.toString(),
          ),
      );
    });

    res.json({
      message: "Merchant shipments fetched successfully",
      count: merchantShipments.length,
      shipments: merchantShipments,
    });
  } catch (error) {
    console.error("Get merchant shipments error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant shipments",
      error: error.message,
    });
  }
};

// ============================================================
// 16. GET SINGLE MERCHANT SHIPMENT
// GET /api/merchant/shipments/:id
// ============================================================
const getMerchantShipmentById = async (req, res) => {
  try {
    const userId = req.user.userId;

    const shipment = await Shipment.findById(req.params.id)
      .populate({
        path: "order",
        populate: {
          path: "items.product",
          select: "name sku brand brandOwner",
        },
      })
      .populate("user", "name email phone");

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    if (!shipment.order || !shipment.order.items) {
      return res.status(404).json({
        message: "Associated order not found",
      });
    }

    const merchantItems = shipment.order.items.filter(
      (item) =>
        item.product &&
        item.product.brandOwner &&
        item.product.brandOwner.toString() === userId.toString(),
    );

    if (merchantItems.length === 0) {
      return res.status(403).json({
        message: "You are not authorized to view this shipment",
      });
    }

    res.json({
      message: "Merchant shipment fetched successfully",
      shipment: {
        ...shipment.toObject(),
        merchantItems,
      },
    });
  } catch (error) {
    console.error("Get merchant shipment error:", error);

    res.status(500).json({
      message: "Failed to fetch merchant shipment",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getDashboard,

  getMerchantProducts,
  getMerchantProductById,
  createMerchantProduct,
  updateMerchantProduct,
  deleteMerchantProduct,

  getMerchantInventory,
  getMerchantProductInventory,
  adjustMerchantInventory,
  getMerchantInventoryMovements,
  getMerchantLowStock,

  getMerchantOrders,
  getMerchantOrderById,
  updateMerchantOrderStatus,

  getMerchantShipments,
  getMerchantShipmentById,
};
