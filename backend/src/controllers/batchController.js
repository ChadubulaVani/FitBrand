const Batch = require("../models/Batch");
const Product = require("../models/Product");

// Create batch
const createBatch = async (req, res) => {
  try {
    const {
      batchNumber,
      product,
      manufacturingDate,
      expiryDate,
      labName,
      coaUrl,
      testStatus,
      notes,
      isActive,
    } = req.body;

    if (!batchNumber || !product || !manufacturingDate || !expiryDate) {
      return res.status(400).json({
        message:
          "Batch number, product, manufacturing date and expiry date are required",
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

    const manufacturing = new Date(manufacturingDate);
    const expiry = new Date(expiryDate);

    if (isNaN(manufacturing.getTime()) || isNaN(expiry.getTime())) {
      return res.status(400).json({
        message: "Invalid manufacturing or expiry date",
      });
    }

    if (expiry <= manufacturing) {
      return res.status(400).json({
        message: "Expiry date must be after manufacturing date",
      });
    }

    const existingBatch = await Batch.findOne({
      batchNumber: batchNumber.toUpperCase().trim(),
    });

    if (existingBatch) {
      return res.status(409).json({
        message: "Batch with this batch number already exists",
      });
    }

    const batch = await Batch.create({
      batchNumber: batchNumber.toUpperCase().trim(),
      product,
      manufacturingDate: manufacturing,
      expiryDate: expiry,
      labName: labName ? labName.trim() : "",
      coaUrl: coaUrl ? coaUrl.trim() : "",
      testStatus: testStatus || "pending",
      notes: notes ? notes.trim() : "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const populatedBatch = await Batch.findById(batch._id).populate(
      "product",
      "name slug sku brand",
    );

    res.status(201).json({
      message: "Batch created successfully",
      batch: populatedBatch,
    });
  } catch (error) {
    console.error("Create batch error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Batch number already exists",
      });
    }

    res.status(500).json({
      message: "Server error while creating batch",
    });
  }
};

// Verify batch by batch number
const verifyBatch = async (req, res) => {
  try {
    const batchNumber = req.params.batchNumber.toUpperCase().trim();

    const batch = await Batch.findOne({
      batchNumber,
      isActive: true,
    }).populate("product", "name slug sku brand description images");

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found or inactive",
        verified: false,
      });
    }

    const currentDate = new Date();

    if (batch.expiryDate < currentDate) {
      return res.status(200).json({
        message: "Batch found but expired",
        verified: false,
        batch,
      });
    }

    if (batch.testStatus === "failed") {
      return res.status(200).json({
        message: "Batch verification failed",
        verified: false,
        batch,
      });
    }

    res.status(200).json({
      message: "Batch verified successfully",
      verified: true,
      batch,
    });
  } catch (error) {
    console.error("Verify batch error:", error.message);

    res.status(500).json({
      message: "Server error while verifying batch",
      verified: false,
    });
  }
};

// Get all active batches
const getBatches = async (req, res) => {
  try {
    const batches = await Batch.find({
      isActive: true,
    })
      .populate("product", "name slug sku brand")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Batches retrieved successfully",
      count: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Get batches error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving batches",
    });
  }
};

// Get batch by ID
const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("product", "name slug sku brand");

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    res.status(200).json({
      message: "Batch retrieved successfully",
      batch,
    });
  } catch (error) {
    console.error("Get batch error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving batch",
    });
  }
};

// Update batch
const updateBatch = async (req, res) => {
  try {
    const {
      batchNumber,
      product,
      manufacturingDate,
      expiryDate,
      labName,
      coaUrl,
      testStatus,
      notes,
      isActive,
    } = req.body;

    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    if (product !== undefined) {
      const productExists = await Product.findOne({
        _id: product,
        isActive: true,
      });

      if (!productExists) {
        return res.status(400).json({
          message: "Valid active product is required",
        });
      }

      batch.product = product;
    }

    let manufacturing = batch.manufacturingDate;
    let expiry = batch.expiryDate;

    if (manufacturingDate !== undefined) {
      manufacturing = new Date(manufacturingDate);

      if (isNaN(manufacturing.getTime())) {
        return res.status(400).json({
          message: "Invalid manufacturing date",
        });
      }

      batch.manufacturingDate = manufacturing;
    }

    if (expiryDate !== undefined) {
      expiry = new Date(expiryDate);

      if (isNaN(expiry.getTime())) {
        return res.status(400).json({
          message: "Invalid expiry date",
        });
      }

      batch.expiryDate = expiry;
    }

    if (expiry <= manufacturing) {
      return res.status(400).json({
        message: "Expiry date must be after manufacturing date",
      });
    }

    if (batchNumber !== undefined) {
      batch.batchNumber = batchNumber.toUpperCase().trim();
    }

    if (labName !== undefined) {
      batch.labName = labName.trim();
    }

    if (coaUrl !== undefined) {
      batch.coaUrl = coaUrl.trim();
    }

    if (testStatus !== undefined) {
      batch.testStatus = testStatus;
    }

    if (notes !== undefined) {
      batch.notes = notes.trim();
    }

    if (isActive !== undefined) {
      batch.isActive = isActive;
    }

    await batch.save();

    const updatedBatch = await Batch.findById(batch._id).populate(
      "product",
      "name slug sku brand",
    );

    res.status(200).json({
      message: "Batch updated successfully",
      batch: updatedBatch,
    });
  } catch (error) {
    console.error("Update batch error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Batch number already exists",
      });
    }

    res.status(500).json({
      message: "Server error while updating batch",
    });
  }
};

// Soft delete batch
const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    batch.isActive = false;

    await batch.save();

    res.status(200).json({
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete batch error:", error.message);

    res.status(500).json({
      message: "Server error while deleting batch",
    });
  }
};

module.exports = {
  createBatch,
  verifyBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
};
