const Compliance = require("../models/Compliance");
const Product = require("../models/Product");

const getAllComplianceRecords = async (req, res) => {
  try {
    const records = await Compliance.find()
      .populate("product", "name sku brand")
      .populate("batch", "batchNumber")
      .populate("reviewedBy", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Get compliance records error:", error.message);

    res.status(500).json({
      message: "Server error while fetching compliance records",
    });
  }
};

const getProductCompliance = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select("name sku brand");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const records = await Compliance.find({
      product: productId,
    })
      .populate("batch", "batchNumber")
      .populate("reviewedBy", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      product,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Get product compliance error:", error.message);

    res.status(500).json({
      message: "Server error while fetching product compliance",
    });
  }
};

const upsertCompliance = async (req, res) => {
  try {
    const { productId } = req.params;

    const {
      batch,
      complianceStatus,
      coaStatus,
      certification,
      referenceNumber,
      expiryDate,
      notes,
    } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const batchValue = batch || null;

    let record = await Compliance.findOne({
      product: productId,
      batch: batchValue,
    });

    if (record) {
      if (complianceStatus !== undefined) {
        record.complianceStatus = complianceStatus;
      }

      if (coaStatus !== undefined) {
        record.coaStatus = coaStatus;
      }

      if (certification !== undefined) {
        record.certification = certification;
      }

      if (referenceNumber !== undefined) {
        record.referenceNumber = referenceNumber;
      }

      if (expiryDate !== undefined) {
        record.expiryDate = expiryDate || null;
      }

      if (notes !== undefined) {
        record.notes = notes;
      }

      record.reviewedBy = req.user.userId;
      record.reviewedAt = new Date();

      await record.save();

      return res.status(200).json({
        message: "Compliance record updated successfully",
        record,
      });
    }

    record = await Compliance.create({
      product: productId,
      batch: batchValue,
      complianceStatus: complianceStatus || "pending",
      coaStatus: coaStatus || "not_submitted",
      certification: certification || "",
      referenceNumber: referenceNumber || "",
      expiryDate: expiryDate || null,
      notes: notes || "",
      reviewedBy: req.user.userId,
      reviewedAt: new Date(),
    });

    res.status(201).json({
      message: "Compliance record created successfully",
      record,
    });
  } catch (error) {
    console.error("Upsert compliance error:", error.message);

    res.status(500).json({
      message: "Server error while saving compliance record",
    });
  }
};

module.exports = {
  getAllComplianceRecords,
  getProductCompliance,
  upsertCompliance,
};
