const express = require("express");

const {
  createIntegration,
  getAllIntegrations,
  getIntegrationById,
  updateIntegration,
  updateIntegrationStatus,
} = require("../controllers/integrationController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ============================================================
// Phase 15 — External Integration Management
// ============================================================

router.use(protect);

router.use(authorizeRoles("admin", "operations"));

router.post("/", createIntegration);

router.get("/", getAllIntegrations);

router.get("/:id", getIntegrationById);

router.put("/:id", updateIntegration);

router.put("/:id/status", updateIntegrationStatus);

module.exports = router;
