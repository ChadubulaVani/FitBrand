const express = require("express");

const { getTenantBySlug } = require("../controllers/tenantController");

const router = express.Router();

// Public white-label configuration
router.get("/:slug", getTenantBySlug);

module.exports = router;
