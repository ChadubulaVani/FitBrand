const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Product = require("../models/Product");

// ============================================================
// Create Tenant
// ============================================================

const createTenant = async (req, res) => {
  try {
    const { name, slug, logo, primaryColor, secondaryColor } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        message: "Tenant name and slug are required",
      });
    }

    const existingTenant = await Tenant.findOne({
      slug: slug.toLowerCase(),
    });

    if (existingTenant) {
      return res.status(409).json({
        message: "Tenant with this slug already exists",
      });
    }

    const tenant = await Tenant.create({
      name,
      slug: slug.toLowerCase(),
      logo: logo || "",
      primaryColor: primaryColor || "#0d6efd",
      secondaryColor: secondaryColor || "#212529",
    });

    return res.status(201).json({
      message: "Tenant created successfully",
      tenant,
    });
  } catch (error) {
    console.error("Create tenant error:", error.message);

    return res.status(500).json({
      message: "Server error while creating tenant",
    });
  }
};

// ============================================================
// Get All Tenants
// ============================================================

const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tenants retrieved successfully",
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error("Get all tenants error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving tenants",
    });
  }
};

// ============================================================
// Get Tenant By ID
// ============================================================

const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    return res.status(200).json({
      message: "Tenant retrieved successfully",
      tenant,
    });
  } catch (error) {
    console.error("Get tenant error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving tenant",
    });
  }
};

// ============================================================
// Get Public Tenant Configuration
// ============================================================

const getTenantBySlug = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      slug: req.params.slug.toLowerCase(),
      isActive: true,
    }).select("name slug logo primaryColor secondaryColor isActive");

    if (!tenant) {
      return res.status(404).json({
        message: "Active tenant not found",
      });
    }

    return res.status(200).json({
      message: "Tenant configuration retrieved successfully",
      tenant,
    });
  } catch (error) {
    console.error("Get tenant by slug error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving tenant configuration",
    });
  }
};

// ============================================================
// Update Tenant
// ============================================================

const updateTenant = async (req, res) => {
  try {
    const { name, slug, logo, primaryColor, secondaryColor } = req.body;

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    if (slug !== undefined) {
      const normalizedSlug = slug.toLowerCase();

      const duplicateTenant = await Tenant.findOne({
        slug: normalizedSlug,
        _id: { $ne: tenant._id },
      });

      if (duplicateTenant) {
        return res.status(409).json({
          message: "Tenant with this slug already exists",
        });
      }

      tenant.slug = normalizedSlug;
    }

    if (name !== undefined) {
      tenant.name = name;
    }

    if (logo !== undefined) {
      tenant.logo = logo;
    }

    if (primaryColor !== undefined) {
      tenant.primaryColor = primaryColor;
    }

    if (secondaryColor !== undefined) {
      tenant.secondaryColor = secondaryColor;
    }

    await tenant.save();

    return res.status(200).json({
      message: "Tenant updated successfully",
      tenant,
    });
  } catch (error) {
    console.error("Update tenant error:", error.message);

    return res.status(500).json({
      message: "Server error while updating tenant",
    });
  }
};

// ============================================================
// Update Tenant Status
// ============================================================

const updateTenantStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be a boolean",
      });
    }

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    tenant.isActive = isActive;

    await tenant.save();

    return res.status(200).json({
      message: `Tenant ${isActive ? "activated" : "deactivated"} successfully`,
      tenant,
    });
  } catch (error) {
    console.error("Update tenant status error:", error.message);

    return res.status(500).json({
      message: "Server error while updating tenant status",
    });
  }
};

// ============================================================
// Assign Tenant To User
// ============================================================

const assignTenantToUser = async (req, res) => {
  try {
    const { tenantId } = req.body;

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (tenantId) {
      const tenant = await Tenant.findById(tenantId);

      if (!tenant) {
        return res.status(404).json({
          message: "Tenant not found",
        });
      }

      if (!tenant.isActive) {
        return res.status(400).json({
          message: "Cannot assign an inactive tenant",
        });
      }
    }

    user.tenant = tenantId || null;

    await user.save();

    return res.status(200).json({
      message: "User tenant assignment updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant,
      },
    });
  } catch (error) {
    console.error("Assign tenant to user error:", error.message);

    return res.status(500).json({
      message: "Server error while assigning tenant to user",
    });
  }
};

// ============================================================
// Assign Tenant To Product
// ============================================================

const assignTenantToProduct = async (req, res) => {
  try {
    const { tenantId } = req.body;

    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (tenantId) {
      const tenant = await Tenant.findById(tenantId);

      if (!tenant) {
        return res.status(404).json({
          message: "Tenant not found",
        });
      }

      if (!tenant.isActive) {
        return res.status(400).json({
          message: "Cannot assign an inactive tenant",
        });
      }
    }

    product.tenant = tenantId || null;

    await product.save();

    return res.status(200).json({
      message: "Product tenant assignment updated successfully",
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        tenant: product.tenant,
      },
    });
  } catch (error) {
    console.error("Assign tenant to product error:", error.message);

    return res.status(500).json({
      message: "Server error while assigning tenant to product",
    });
  }
};

module.exports = {
  createTenant,
  getAllTenants,
  getTenantById,
  getTenantBySlug,
  updateTenant,
  updateTenantStatus,
  assignTenantToUser,
  assignTenantToProduct,
};
