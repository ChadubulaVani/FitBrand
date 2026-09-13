const express = require("express");

const { receiveWebhook } = require("../controllers/webhookController");

const router = express.Router();

// ============================================================
// Phase 15 — External Webhook Receiver
// ============================================================

// Webhooks are intentionally unauthenticated.
// Real providers authenticate them using signatures/secrets.
router.post("/:provider", receiveWebhook);

module.exports = router;
