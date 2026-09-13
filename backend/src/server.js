const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const batchRoutes = require("./routes/batchRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const couponRoutes = require("./routes/couponRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const bundleRoutes = require("./routes/bundleRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const brandOwnerRoutes = require("./routes/brandOwnerRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const adminRoutes = require("./routes/adminRoutes");
const complianceRoutes = require("./routes/complianceRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

// ============================================================
// Production / Security Configuration
// ============================================================

app.disable("x-powered-by");

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ============================================================
// Security Headers
// ============================================================

app.use(helmet());

// ============================================================
// CORS
// ============================================================

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests and local tools
      // that do not send an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      // Development fallback
      if (configuredOrigins.length === 0) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);

// ============================================================
// Request Body Protection
// ============================================================

app.use(
  express.json({
    limit: "1mb",

    verify: (req, res, buffer) => {
      if (req.originalUrl.startsWith("/api/webhooks/")) {
        req.rawBody = Buffer.from(buffer);
      }
    },
  }),
);

// ============================================================
// Rate Limiting
// ============================================================

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const maxRequests = Number(process.env.RATE_LIMIT_MAX) || 300;

const apiLimiter = rateLimit({
  windowMs,
  limit: maxRequests,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    message: "Too many requests. Please try again later.",
  },
});

// Apply rate limiting to API routes.
app.use("/api", apiLimiter);

// ============================================================
// API Routes
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/brand-owner", brandOwnerRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/admin/integrations", integrationRoutes);
app.use("/api/webhooks", webhookRoutes);

// ============================================================
// Root Endpoint
// ============================================================

app.get("/", (req, res) => {
  res.status(200).json({
    message: "FITBRAND API is running 🚀",
  });
});

// ============================================================
// 404 Handler
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// ============================================================
// Central Error Handler
// ============================================================

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error.message);

  const statusCode = error.status || 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message,
  });
});

// ============================================================
// Environment Validation
// ============================================================

const requiredEnvironmentVariables = [
  "MONGODB_URI",
  "JWT_SECRET",
  "WEBHOOK_SECRET",
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (variable) => !process.env[variable],
);

if (missingEnvironmentVariables.length > 0) {
  console.error("Missing required environment variables:");

  missingEnvironmentVariables.forEach((variable) => {
    console.error(`- ${variable}`);
  });

  process.exit(1);
}

// ============================================================
// Database + Server Startup
// ============================================================

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");

    app.listen(PORT, () => {
      console.log(`FITBRAND API running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);

    process.exit(1);
  });
