const Inventory = require("../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const Product = require("../models/Product");
const Batch = require("../models/Batch");

// ============================================================
// Phase 11 helper
// Check whether a brand owner owns the inventory's product.
// Admin and operations retain global access.
// ============================================================
const ensureInventoryOwnership = async (inventory, req, res) => {
  if (!inventory) {
    res.status(404).json({
      message: "Inventory not found",
    });

    return false;
  }

  // Admin and operations can manage all inventory.
  if (req.user.role === "admin" || req.user.role === "operations") {
    return true;
  }

  // Brand owner can only access inventory belonging
  // to their own products.
  if (req.user.role === "brand_owner") {
    const product = await Product.findById(inventory.product).select(
      "brandOwner",
    );

    if (
      !product ||
      !product.brandOwner ||
      product.brandOwner.toString() !== req.user.userId.toString()
    ) {
      res.status(403).json({
        message: "You are not authorized to manage this inventory",
      });

      return false;
    }

    return true;
  }

  res.status(403).json({
    message: "You are not authorized to manage inventory",
  });

  return false;
};

// Create inventory
const createInventory = async (req, res) => {
  try {
    const { product, batch, totalStock, lowStockThreshold } = req.body;

    if (!product) {
      return res.status(400).json({
        message: "Product is required",
      });
    }

    const productExists = await Product.findOne({
      _id: product,
      isActive: true,
    });

    if (!productExists) {
      return res.status(400).json({
        message: "Valid active product is required",
      });
    }

    // ========================================================
    // Phase 11 ownership protection
    // ========================================================
    if (req.user.role === "brand_owner") {
      if (
        !productExists.brandOwner ||
        productExists.brandOwner.toString() !== req.user.userId.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to create inventory for this product",
        });
      }
    }

    const existingInventory = await Inventory.findOne({
      product,
    });

    if (existingInventory) {
      return res.status(409).json({
        message: "Inventory already exists for this product",
      });
    }

    if (
      totalStock !== undefined &&
      (!Number.isInteger(Number(totalStock)) || Number(totalStock) < 0)
    ) {
      return res.status(400).json({
        message: "Total stock must be a non-negative integer",
      });
    }

    if (batch !== undefined && batch !== null) {
      const batchExists = await Batch.findOne({
        _id: batch,
        isActive: true,
      });

      if (!batchExists) {
        return res.status(400).json({
          message: "Valid active batch is required",
        });
      }

      if (batchExists.product.toString() !== product.toString()) {
        return res.status(400).json({
          message: "Batch does not belong to this product",
        });
      }
    }

    const stock = totalStock !== undefined ? Number(totalStock) : 0;

    const threshold =
      lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10;

    if (!Number.isInteger(threshold) || threshold < 0) {
      return res.status(400).json({
        message: "Low stock threshold must be a non-negative integer",
      });
    }

    const inventory = await Inventory.create({
      product,
      batch: batch || null,
      totalStock: stock,
      reservedStock: 0,
      lowStockThreshold: threshold,
      lastRestockedAt: stock > 0 ? new Date() : null,
    });

    // Keep Product stock synchronized
    productExists.stockQuantity = stock;
    await productExists.save();

    const populatedInventory = await Inventory.findById(inventory._id)
      .populate("product", "name slug sku brand stockQuantity isActive")
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus");

    res.status(201).json({
      message: "Inventory created successfully",
      inventory: populatedInventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Inventory already exists for this product",
      });
    }

    res.status(500).json({
      message: "Server error while creating inventory",
    });
  }
};

// Get all inventory
const getInventory = async (req, res) => {
  try {
    const filter = {
      isActive: true,
    };

    // ========================================================
    // Phase 11:
    // Brand owners only see their own product inventory.
    // Admin and operations retain the original global view.
    // ========================================================
    if (req.user.role === "brand_owner") {
      const ownedProducts = await Product.find({
        brandOwner: req.user.userId,
      }).select("_id");

      filter.product = {
        $in: ownedProducts.map((product) => product._id),
      };
    }

    const inventory = await Inventory.find(filter)
      .populate(
        "product",
        "name slug sku brand price discountPrice stockQuantity isActive",
      )
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Inventory retrieved successfully",
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error("Get inventory error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving inventory",
    });
  }
};

// Get inventory by product
const getInventoryByProduct = async (req, res) => {
  try {
    // ========================================================
    // Phase 11 ownership protection
    // ========================================================
    if (req.user.role === "brand_owner") {
      const product = await Product.findById(req.params.productId).select(
        "brandOwner",
      );

      if (
        !product ||
        !product.brandOwner ||
        product.brandOwner.toString() !== req.user.userId.toString()
      ) {
        return res.status(403).json({
          message: "You are not authorized to view this inventory",
        });
      }
    }

    const inventory = await Inventory.findOne({
      product: req.params.productId,
      isActive: true,
    })
      .populate(
        "product",
        "name slug sku brand price discountPrice stockQuantity isActive",
      )
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus");

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    res.status(200).json({
      message: "Inventory retrieved successfully",
      inventory,
    });
  } catch (error) {
    console.error("Get inventory by product error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving inventory",
    });
  }
};

// Adjust inventory
const adjustInventory = async (req, res) => {
  try {
    const { type, quantity, adjustment, reason } = req.body;

    const allowedTypes = [
      "restock",
      "adjustment",
      "return",
      "damage",
      "expired",
    ];

    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid inventory movement type",
      });
    }

    // Normal inventory movements use a positive quantity.
    // Manual adjustment uses a signed adjustment value instead.
    let adjustmentQuantity = null;
    let adjustmentValue = null;

    if (type === "adjustment") {
      adjustmentValue = Number(adjustment);

      if (!Number.isInteger(adjustmentValue) || adjustmentValue === 0) {
        return res.status(400).json({
          message: "Adjustment must be a non-zero integer",
        });
      }
    } else {
      adjustmentQuantity = Number(quantity);

      if (!Number.isInteger(adjustmentQuantity) || adjustmentQuantity < 1) {
        return res.status(400).json({
          message: "Quantity must be a positive integer",
        });
      }
    }

    const inventory = await Inventory.findOne({
      _id: req.params.id,
      isActive: true,
    });

    // ========================================================
    // Phase 11 ownership protection
    // ========================================================
    if (!(await ensureInventoryOwnership(inventory, req, res))) {
      return;
    }

    const previousStock = inventory.totalStock;

    const stockIncreaseTypes = ["restock", "return"];

    const stockDecreaseTypes = ["damage", "expired"];

    // Restock / return
    if (stockIncreaseTypes.includes(type)) {
      inventory.totalStock += adjustmentQuantity;
    }

    // Damage / expired
    if (stockDecreaseTypes.includes(type)) {
      if (adjustmentQuantity > inventory.totalStock) {
        return res.status(400).json({
          message: "Adjustment quantity exceeds available stock",
          availableStock: inventory.totalStock,
        });
      }

      inventory.totalStock -= adjustmentQuantity;
    }

    // Manual adjustment
    if (type === "adjustment") {
      const newStock = inventory.totalStock + adjustmentValue;

      if (newStock < 0) {
        return res.status(400).json({
          message: "Adjustment cannot make stock negative",
        });
      }

      inventory.totalStock = newStock;
    }

    // Prevent reserved stock from exceeding total stock
    if (inventory.reservedStock > inventory.totalStock) {
      inventory.reservedStock = inventory.totalStock;
    }

    // Update last restocked time
    if (type === "restock" || type === "return") {
      inventory.lastRestockedAt = new Date();
    }

    await inventory.save();

    // Keep Product stock synchronized
    const product = await Product.findById(inventory.product);

    if (product) {
      product.stockQuantity = inventory.totalStock;

      await product.save();
    }

    // Movement quantity is always stored as a
    // positive number in InventoryMovement.
    const movementQuantity =
      type === "adjustment" ? Math.abs(adjustmentValue) : adjustmentQuantity;

    await InventoryMovement.create({
      inventory: inventory._id,
      product: inventory.product,
      batch: inventory.batch,
      type,
      quantity: movementQuantity,
      previousStock,
      newStock: inventory.totalStock,
      reason: reason || "",
      performedBy: req.user.userId,
    });

    const updatedInventory = await Inventory.findById(inventory._id)
      .populate("product", "name slug sku brand stockQuantity isActive")
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus");

    res.status(200).json({
      message: "Inventory adjusted successfully",
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error("Adjust inventory error:", error.message);

    res.status(500).json({
      message: "Server error while adjusting inventory",
    });
  }
};

// Reserve stock
const reserveStock = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const inventory = await Inventory.findOne({
      _id: req.params.id,
      isActive: true,
    });

    // ========================================================
    // Phase 11 ownership protection
    // ========================================================
    if (!(await ensureInventoryOwnership(inventory, req, res))) {
      return;
    }

    const availableStock = inventory.totalStock - inventory.reservedStock;

    if (quantity > availableStock) {
      return res.status(400).json({
        message: "Requested quantity exceeds available stock",
        availableStock,
      });
    }

    const previousStock = inventory.totalStock;

    inventory.reservedStock += quantity;

    await inventory.save();

    await InventoryMovement.create({
      inventory: inventory._id,
      product: inventory.product,
      batch: inventory.batch,
      type: "reservation",
      quantity,
      previousStock,
      newStock: inventory.totalStock,
      reason: "Stock reserved",
      performedBy: req.user.userId,
    });

    res.status(200).json({
      message: "Stock reserved successfully",
      inventory,
      availableStock: inventory.totalStock - inventory.reservedStock,
    });
  } catch (error) {
    console.error("Reserve stock error:", error.message);

    res.status(500).json({
      message: "Server error while reserving stock",
    });
  }
};

// Release reserved stock
const releaseStock = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const inventory = await Inventory.findOne({
      _id: req.params.id,
      isActive: true,
    });

    // ========================================================
    // Phase 11 ownership protection
    // ========================================================
    if (!(await ensureInventoryOwnership(inventory, req, res))) {
      return;
    }

    if (quantity > inventory.reservedStock) {
      return res.status(400).json({
        message: "Release quantity exceeds reserved stock",
        reservedStock: inventory.reservedStock,
      });
    }

    inventory.reservedStock -= quantity;

    await inventory.save();

    await InventoryMovement.create({
      inventory: inventory._id,
      product: inventory.product,
      batch: inventory.batch,
      type: "release",
      quantity,
      previousStock: inventory.totalStock,
      newStock: inventory.totalStock,
      reason: "Reserved stock released",
      performedBy: req.user.userId,
    });

    res.status(200).json({
      message: "Reserved stock released successfully",
      inventory,
      availableStock: inventory.totalStock - inventory.reservedStock,
    });
  } catch (error) {
    console.error("Release stock error:", error.message);

    res.status(500).json({
      message: "Server error while releasing stock",
    });
  }
};

// Get low-stock products
const getLowStockInventory = async (req, res) => {
  try {
    const filter = {
      isActive: true,
    };

    // ========================================================
    // Phase 11:
    // Brand owners only see their own inventory.
    // ========================================================
    if (req.user.role === "brand_owner") {
      const ownedProducts = await Product.find({
        brandOwner: req.user.userId,
      }).select("_id");

      filter.product = {
        $in: ownedProducts.map((product) => product._id),
      };
    }

    const inventory = await Inventory.find(filter)
      .populate("product", "name slug sku brand stockQuantity isActive")
      .populate("batch", "batchNumber expiryDate testStatus");

    const lowStock = inventory.filter(
      (item) => item.availableStock <= item.lowStockThreshold,
    );

    res.status(200).json({
      message: "Low-stock inventory retrieved successfully",
      count: lowStock.length,
      inventory: lowStock,
    });
  } catch (error) {
    console.error("Low-stock inventory error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving low-stock inventory",
    });
  }
};

// Get movement history
const getInventoryMovements = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    // ========================================================
    // Phase 11 ownership protection
    // ========================================================
    if (!(await ensureInventoryOwnership(inventory, req, res))) {
      return;
    }

    const movements = await InventoryMovement.find({
      inventory: req.params.id,
    })
      .populate("product", "name slug sku brand")
      .populate("batch", "batchNumber expiryDate")
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Inventory movements retrieved successfully",
      count: movements.length,
      movements,
    });
  } catch (error) {
    console.error("Inventory movement error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving inventory movements",
    });
  }
};

// Get expiring inventory
const getExpiringInventory = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;

    if (!Number.isInteger(days) || days < 1) {
      return res.status(400).json({
        message: "Days must be a positive integer",
      });
    }

    const today = new Date();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const filter = {
      isActive: true,
    };

    // ========================================================
    // Phase 11:
    // Brand owners only see batches belonging to
    // their own products.
    // ========================================================
    if (req.user.role === "brand_owner") {
      const ownedProducts = await Product.find({
        brandOwner: req.user.userId,
      }).select("_id");

      filter.product = {
        $in: ownedProducts.map((product) => product._id),
      };
    }

    const inventory = await Inventory.find(filter)
      .populate("product", "name slug sku brand")
      .populate("batch", "batchNumber manufacturingDate expiryDate testStatus");

    const expiringInventory = inventory.filter((item) => {
      if (!item.batch) {
        return false;
      }

      const expiry = new Date(item.batch.expiryDate);

      return expiry >= today && expiry <= futureDate;
    });

    res.status(200).json({
      message: "Expiring inventory retrieved successfully",
      count: expiringInventory.length,
      inventory: expiringInventory,
    });
  } catch (error) {
    console.error("Expiring inventory error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving expiring inventory",
    });
  }
};

module.exports = {
  createInventory,
  getInventory,
  getInventoryByProduct,
  adjustInventory,
  reserveStock,
  releaseStock,
  getLowStockInventory,
  getInventoryMovements,
  getExpiringInventory,
};
