const Category = require("../models/Category");

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, image } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        message: "Category name and slug are required",
      });
    }

    const existingCategory = await Category.findOne({
      $or: [{ name: name.trim() }, { slug: slug.toLowerCase().trim() }],
    });

    if (existingCategory) {
      return res.status(409).json({
        message: "Category with this name or slug already exists",
      });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      description: description ? description.trim() : "",
      image: image || "",
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error.message);

    res.status(500).json({
      message: "Server error while creating category",
    });
  }
};

// Get all active categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json({
      message: "Categories retrieved successfully",
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving categories",
    });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    res.status(200).json({
      message: "Category retrieved successfully",
      category,
    });
  } catch (error) {
    console.error("Get category error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving category",
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, slug, description, image, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      category.name = name.trim();
    }

    if (slug !== undefined) {
      category.slug = slug.toLowerCase().trim();
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      category.image = image;
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Category name or slug already exists",
      });
    }

    res.status(500).json({
      message: "Server error while updating category",
    });
  }
};

// Soft delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    category.isActive = false;

    await category.save();

    res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error.message);

    res.status(500).json({
      message: "Server error while deleting category",
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
