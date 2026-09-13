const express = require("express");

const {
  getAllComplianceRecords,
  getProductCompliance,
  upsertCompliance,
} = require("../controllers/complianceController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin", "operations"));

router.get("/", getAllComplianceRecords);

router.get("/product/:productId", getProductCompliance);

router.put("/product/:productId", upsertCompliance);

module.exports = router;
