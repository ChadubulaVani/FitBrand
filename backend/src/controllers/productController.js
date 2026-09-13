const Product = require("../models/Product");
const Category = require("../models/Category");

// ============================================================
// Helper: Check whether brand owner owns the product
// ============================================================
const ensureProductOwnership = (product, req, res) => {
  if (!product) {
    res.status(404).json({
      message: "Product not found",
    });

    return false;
  }

  // Admin has global product access.
  if (req.user.role === "admin") {
    return true;
  }

  // Brand owner can only manage their own products.
  if (req.user.role === "brand_owner") {
    if (
      !product.brandOwner ||
      product.brandOwner.toString() !== req.user.userId.toString()
    ) {
      res.status(403).json({
        message: "You are not authorized to manage this product",
      });

      return false;
    }

    return true;
  }

  res.status(403).json({
    message: "You are not authorized to manage products",
  });

  return false;
};

// ============================================================
// CREATE PRODUCT
// POST /api/products
// ============================================================
const createProduct = async (req, res) => {
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
    const normalizedSlug = slug.toLowerCase().trim();

    const existingSlug = await Product.findOne({
      slug: normalizedSlug,
    });

    if (existingSlug) {
      return res.status(409).json({
        message: "Product slug already exists",
      });
    }

    // --------------------------------------------------------
    // Validate unique SKU
    // --------------------------------------------------------
    const normalizedSku = sku.toUpperCase().trim();

    const existingSku = await Product.findOne({
      sku: normalizedSku,
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
    // Determine ownership
    // --------------------------------------------------------
    // Admin-created products remain unassigned unless an owner
    // is explicitly assigned later through an administrative flow.
    //
    // Brand-owner-created products automatically belong to the
    // authenticated brand owner.
    const brandOwner = req.user.role === "brand_owner" ? req.user.userId : null;

    // --------------------------------------------------------
    // Create product
    // --------------------------------------------------------
    const product = await Product.create({
      name,
      slug: normalizedSlug,
      sku: normalizedSku,
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
      brandOwner,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// ============================================================
// GET PRODUCTS
// GET /api/products
// ============================================================
const getProducts = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, featured, search } = req.query;

    const filter = {
      isActive: true,
    };

    if (category) {
      filter.category = category;
    }

    if (brand) {
      filter.brand = {
        $regex: brand,
        $options: "i",
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};

      if (minPrice !== undefined) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (featured !== undefined) {
      filter.isFeatured = featured === "true";
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    res.json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ============================================================
// GET PRODUCT BY ID
// GET /api/products/:id
// ============================================================
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("category", "name slug description");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Get product by ID error:", error);

    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ============================================================
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!ensureProductOwnership(product, req, res)) {
      return;
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
    // Validate category if supplied
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
        _id: {
          $ne: product._id,
        },
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
        _id: {
          $ne: product._id,
        },
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
    // Update allowed fields
    // --------------------------------------------------------
    if (name !== undefined) {
      product.name = name;
    }

    if (brand !== undefined) {
      product.brand = brand;
    }

    if (description !== undefined) {
      product.description = description;
    }

    if (price !== undefined) {
      product.price = price;
    }

    if (discountPrice !== undefined) {
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

    if (stockQuantity !== undefined) {
      product.stockQuantity = stockQuantity;
    }

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured;
    }

    if (isActive !== undefined) {
      product.isActive = isActive;
    }

    // --------------------------------------------------------
    // Never allow a brand owner to change ownership
    // --------------------------------------------------------
    if (req.user.role === "brand_owner") {
      product.brandOwner = req.user.userId;
    }

    await product.save();

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// ============================================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ============================================================
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!ensureProductOwnership(product, req, res)) {
      return;
    }

    // Soft delete to preserve historical order references.
    product.isActive = false;

    await product.save();

    res.json({
      message: "Product deactivated successfully",
      product,
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      message: "Failed to deactivate product",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
