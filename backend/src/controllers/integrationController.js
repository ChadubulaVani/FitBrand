const Integration = require("../models/Integration");

// ============================================================
// Create Integration
// ============================================================

const createIntegration = async (req, res) => {
  try {
    const {
      name,
      type,
      provider,
      environment,
      apiBaseUrl,
      webhookUrl,
      isEnabled,
      description,
    } = req.body;

    if (!name || !type || !provider) {
      return res.status(400).json({
        message: "Name, type and provider are required",
      });
    }

    const integration = await Integration.create({
      name,
      type,
      provider,
      environment: environment || "sandbox",
      apiBaseUrl: apiBaseUrl || "",
      webhookUrl: webhookUrl || "",
      isEnabled: typeof isEnabled === "boolean" ? isEnabled : false,
      description: description || "",
    });

    return res.status(201).json({
      message: "Integration created successfully",
      integration,
    });
  } catch (error) {
    console.error("Create integration error:", error.message);

    return res.status(500).json({
      message: "Server error while creating integration",
    });
  }
};

// ============================================================
// Get All Integrations
// ============================================================

const getAllIntegrations = async (req, res) => {
  try {
    const integrations = await Integration.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Integrations retrieved successfully",
      count: integrations.length,
      integrations,
    });
  } catch (error) {
    console.error("Get integrations error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving integrations",
    });
  }
};

// ============================================================
// Get Integration By ID
// ============================================================

const getIntegrationById = async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);

    if (!integration) {
      return res.status(404).json({
        message: "Integration not found",
      });
    }

    return res.status(200).json({
      message: "Integration retrieved successfully",
      integration,
    });
  } catch (error) {
    console.error("Get integration error:", error.message);

    return res.status(500).json({
      message: "Server error while retrieving integration",
    });
  }
};

// ============================================================
// Update Integration
// ============================================================

const updateIntegration = async (req, res) => {
  try {
    const {
      name,
      type,
      provider,
      environment,
      apiBaseUrl,
      webhookUrl,
      isEnabled,
      description,
    } = req.body;

    const integration = await Integration.findById(req.params.id);

    if (!integration) {
      return res.status(404).json({
        message: "Integration not found",
      });
    }

    if (name !== undefined) {
      integration.name = name;
    }

    if (type !== undefined) {
      integration.type = type;
    }

    if (provider !== undefined) {
      integration.provider = provider;
    }

    if (environment !== undefined) {
      integration.environment = environment;
    }

    if (apiBaseUrl !== undefined) {
      integration.apiBaseUrl = apiBaseUrl;
    }

    if (webhookUrl !== undefined) {
      integration.webhookUrl = webhookUrl;
    }

    if (isEnabled !== undefined) {
      if (typeof isEnabled !== "boolean") {
        return res.status(400).json({
          message: "isEnabled must be a boolean",
        });
      }

      integration.isEnabled = isEnabled;
    }

    if (description !== undefined) {
      integration.description = description;
    }

    await integration.save();

    return res.status(200).json({
      message: "Integration updated successfully",
      integration,
    });
  } catch (error) {
    console.error("Update integration error:", error.message);

    return res.status(500).json({
      message: "Server error while updating integration",
    });
  }
};

// ============================================================
// Update Integration Status
// ============================================================

const updateIntegrationStatus = async (req, res) => {
  try {
    const { isEnabled } = req.body;

    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({
        message: "isEnabled must be a boolean",
      });
    }

    const integration = await Integration.findById(req.params.id);

    if (!integration) {
      return res.status(404).json({
        message: "Integration not found",
      });
    }

    integration.isEnabled = isEnabled;

    await integration.save();

    return res.status(200).json({
      message: `Integration ${isEnabled ? "enabled" : "disabled"} successfully`,
      integration,
    });
  } catch (error) {
    console.error("Update integration status error:", error.message);

    return res.status(500).json({
      message: "Server error while updating integration status",
    });
  }
};

module.exports = {
  createIntegration,
  getAllIntegrations,
  getIntegrationById,
  updateIntegration,
  updateIntegrationStatus,
};
