const crypto = require("crypto");
const Integration = require("../models/Integration");

// ============================================================
// Verify Webhook Signature
// ============================================================

const verifyWebhookSignature = (req) => {
  const signatureHeader = req.headers["x-fitbrand-signature"];

  if (typeof signatureHeader !== "string" || !signatureHeader.trim()) {
    return false;
  }

  const secret = process.env.WEBHOOK_SECRET;

  if (typeof secret !== "string" || secret.length < 32) {
    console.error("WEBHOOK_SECRET is missing or too weak");

    return false;
  }

  if (!req.rawBody) {
    console.error("Raw webhook body is not available");

    return false;
  }

  // Expected format:
  // sha256=<64-character hexadecimal HMAC>
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const providedSignature = signatureHeader.slice("sha256=".length);

  if (!/^[a-f0-9]{64}$/i.test(providedSignature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex");

  const providedBuffer = Buffer.from(providedSignature, "hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

// ============================================================
// External Webhook Receiver
// ============================================================

const receiveWebhook = async (req, res) => {
  try {
    const { provider } = req.params;

    const integration = await Integration.findOne({
      provider,
      type: "webhook",
      isEnabled: true,
    });

    if (!integration) {
      return res.status(404).json({
        message: "Active webhook integration not found",
      });
    }

    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({
        message: "Invalid or missing webhook signature",
      });
    }

    console.log(`Verified webhook received from ${provider}`);

    return res.status(200).json({
      message: "Webhook received successfully",
      provider,
      received: true,
    });
  } catch (error) {
    console.error("Webhook processing error:", error.message);

    return res.status(500).json({
      message: "Server error while processing webhook",
    });
  }
};

module.exports = {
  receiveWebhook,
};
