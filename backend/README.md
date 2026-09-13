# FITBRAND Backend

A complete REST API backend for the **FITBRAND E-Commerce Platform**.

FITBRAND is designed as a fitness and supplement e-commerce platform that supports customers, brand owners, operations teams, and administrators.

The backend provides APIs for:

* User registration and login
* Role-based access control
* Product and category management
* Product batches and Certificates of Analysis (COA)
* Shopping cart
* Checkout and orders
* Inventory management
* Coupons and discounts
* Subscriptions
* Product bundles
* Shipment and tracking management
* Brand-owner / merchant APIs
* Operations and administration APIs
* Compliance management
* Multi-tenant / white-label foundation
* External integrations
* Webhooks
* Security and production protections

---

## 1. Project Overview

FITBRAND follows a REST API architecture using:

* **Node.js** - JavaScript runtime
* **Express.js** - Backend web framework
* **MongoDB** - Database
* **Mongoose** - MongoDB object modeling
* **JWT** - Authentication
* **bcryptjs** - Password hashing
* **Helmet** - Security headers
* **express-rate-limit** - API rate limiting
* **CORS** - Cross-Origin Resource Sharing

The backend is organized using controllers, routes, models, and middleware.

---

# 2. Main Features

## Authentication

The backend supports:

* User registration
* User login
* JWT authentication
* Current-user information
* Password hashing
* Active/inactive account protection
* Role-based authorization

Supported roles are:

```text
customer
brand_owner
operations
admin
```

---

## User Management

Users can be managed according to their role.

The system stores:

* Name
* Email
* Phone
* Password hash
* Role
* Tenant
* Active/inactive status
* Created/updated timestamps

Passwords are never stored as plain text.

Passwords are hashed using `bcryptjs`.

---

## Product Management

Products support:

* Product name
* Slug
* SKU
* Brand
* Brand owner
* Tenant
* Category
* Description
* Price
* Discount price
* Product images
* Flavors
* Servings
* Serving size
* Ingredients
* Supplement facts
* Stock quantity
* Featured status
* Active/inactive status

---

## Categories

The category system allows products to be organized into categories.

Examples:

```text
Protein
Pre-Workout
Vitamins
Creatine
Supplements
Health & Wellness
```

---

## Batch & COA Management

Products can be associated with manufacturing batches.

The batch system supports information such as:

* Batch number
* Manufacturing information
* Expiry information
* Quantity
* Status
* Certificate of Analysis information

COA information helps provide product quality and compliance information.

---

## Shopping Cart

The cart system supports:

* Adding products
* Updating quantities
* Removing products
* Viewing the current cart
* Clearing the cart

Cart operations are associated with authenticated users.

---

## Checkout & Orders

The order system supports:

* Checkout
* Order creation
* Order items
* Pricing
* Order totals
* Customer information
* Order status
* Payment information
* Shipping information

Orders can move through different stages during their lifecycle.

---

## Inventory

Inventory functionality supports:

* Stock tracking
* Stock updates
* Inventory transactions
* Stock additions
* Stock deductions
* Inventory ownership/audit information

Inventory operations are protected according to the user's role.

---

## Coupons & Discounts

The coupon system supports:

* Coupon codes
* Percentage discounts
* Fixed discounts
* Minimum order requirements
* Maximum discount limits
* Start and expiry dates
* Usage limits
* Active/inactive status

---

## Subscriptions

The subscription functionality provides a foundation for recurring purchases.

It supports subscription information such as:

* Customer
* Products
* Frequency
* Pricing
* Status
* Start date
* Next billing date

---

## Product Bundles

Bundles allow multiple products to be grouped together.

A bundle can contain:

* Bundle name
* Products
* Bundle price
* Description
* Active/inactive status

---

## Logistics

The logistics module provides shipment functionality.

It supports:

* Shipment creation
* Shipment information
* Carrier information
* Tracking information
* Shipment status

---

## Tracking

The tracking APIs allow shipment tracking information to be stored and retrieved.

Typical shipment stages can include:

```text
pending
processing
shipped
in_transit
delivered
cancelled
```

The exact available statuses depend on the implemented shipment model.

---

# 3. Brand Owner / Merchant APIs

FITBRAND supports brand owners and merchants.

Brand owners can work with their products and related business information.

The platform contains dedicated APIs for:

```text
Brand Owner
Merchant
```

These APIs are protected with authentication and role-based authorization.

The product model includes:

```text
brandOwner
```

which can associate a product with its responsible brand owner.

---

# 4. Operations & Administration

The backend provides separate functionality for operational and administrative users.

Supported administrative functionality includes:

* User management
* Product/category management
* Inventory operations
* Compliance operations
* Integration management
* Operational controls

Role-based middleware prevents unauthorized users from accessing protected administrative resources.

---

# 5. Compliance

The compliance module provides a foundation for managing compliance-related information.

This is useful for a supplement and fitness product platform where product quality, documentation, and regulatory information are important.

The backend includes dedicated compliance APIs for authorized users.

---

# 6. Multi-Tenant / White-Label Foundation

FITBRAND includes a multi-tenant foundation.

A tenant can have:

* Name
* Slug
* Logo
* Primary color
* Secondary color
* Active/inactive status

Users can be associated with a tenant.

Products can also be associated with a tenant.

Example:

```text
Tenant
  |
  +-- Users
  |
  +-- Products
```

This provides the foundation for supporting multiple brands or white-label storefronts.

### Important limitation

The current implementation provides the **multi-tenant foundation**, but it is not intended to claim complete tenant isolation across every existing API.

Additional tenant-scoped filtering and authorization would be required before deploying a fully isolated multi-tenant production system.

---

# 7. External Integrations

FITBRAND contains an integration management system.

Integrations can have types such as:

```text
payment
shipping
webhook
analytics
other
```

Each integration can contain:

* Name
* Type
* Provider
* Environment
* API base URL
* Webhook URL
* Enabled/disabled status
* Description

Integration management is protected and available to authorized administrative/operations users.

---

# 8. Webhooks

FITBRAND supports external webhook receiving.

Webhook endpoint format:

```text
POST /api/webhooks/:provider
```

Webhook requests require a valid HMAC SHA-256 signature.

The expected signature format is:

```text
sha256=<64-character hexadecimal HMAC>
```

The signature is generated using the configured:

```text
WEBHOOK_SECRET
```

The backend verifies the signature against the **raw request body**.

The comparison uses:

```text
crypto.timingSafeEqual()
```

This helps prevent timing-based signature comparison attacks.

Unsigned, malformed, or invalid webhook signatures are rejected.

---

# 9. Security

Phase 16 added several production-oriented security protections.

## Helmet

Helmet is enabled to add common HTTP security headers.

For example:

```text
X-Content-Type-Options: nosniff
```

The Express header:

```text
X-Powered-By
```

is disabled so the server does not unnecessarily reveal that it is using Express.

---

## CORS

CORS is configured through:

```text
CORS_ORIGIN
```

Example:

```env
CORS_ORIGIN=http://localhost:3000
```

Multiple origins can be configured by separating them with commas.

Example:

```env
CORS_ORIGIN=http://localhost:3000,https://example.com
```

---

## Request Body Limit

JSON request bodies are limited to:

```text
1 MB
```

This helps prevent unnecessarily large requests from consuming server resources.

Requests exceeding the configured limit are rejected.

---

## Rate Limiting

The API uses `express-rate-limit`.

Default configuration:

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

This means:

```text
300 requests
within 15 minutes
```

for the configured API rate-limit window.

The limiter is applied to:

```text
/api
```

routes.

---

## JWT Authentication

Protected routes require:

```text
Authorization: Bearer <JWT_TOKEN>
```

JWT tokens are signed using:

```text
JWT_SECRET
```

Tokens currently expire after:

```text
7 days
```

---

## Password Security

Passwords are hashed with:

```text
bcryptjs
```

The original password is not stored in the database.

---

## Webhook Security

Webhook signatures use:

```text
HMAC-SHA256
```

and are verified against the raw request body.

The webhook secret must be stored in an environment variable and should never be committed to Git.

---

# 10. Project Structure

The backend follows a modular structure.

```text
backend/
│
├── src/
│   │
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── batchController.js
│   │   ├── brandOwnerController.js
│   │   ├── bundleController.js
│   │   ├── cartController.js
│   │   ├── categoryController.js
│   │   ├── complianceController.js
│   │   ├── couponController.js
│   │   ├── integrationController.js
│   │   ├── inventoryController.js
│   │   ├── merchantController.js
│   │   ├── orderController.js
│   │   ├── productController.js
│   │   ├── shipmentController.js
│   │   ├── subscriptionController.js
│   │   ├── tenantController.js
│   │   ├── trackingController.js
│   │   ├── userController.js
│   │   └── webhookController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   │
│   ├── models/
│   │   ├── Batch.js
│   │   ├── Bundle.js
│   │   ├── Cart.js
│   │   ├── Category.js
│   │   ├── Compliance.js
│   │   ├── Coupon.js
│   │   ├── Integration.js
│   │   ├── Inventory.js
│   │   ├── Order.js
│   │   ├── Product.js
│   │   ├── Shipment.js
│   │   ├── Subscription.js
│   │   ├── Tenant.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── batchRoutes.js
│   │   ├── brandOwnerRoutes.js
│   │   ├── bundleRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── complianceRoutes.js
│   │   ├── couponRoutes.js
│   │   ├── integrationRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── merchantRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── productRoutes.js
│   │   ├── shipmentRoutes.js
│   │   ├── subscriptionRoutes.js
│   │   ├── tenantRoutes.js
│   │   ├── trackingRoutes.js
│   │   ├── userRoutes.js
│   │   └── webhookRoutes.js
│   │
│   └── server.js
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

> The exact list of files may grow as new features are added.

---

# 11. API Base URL

During local development:

```text
http://localhost:5000
```

The API prefix is:

```text
/api
```

Therefore, an endpoint such as:

```text
GET /api/products
```

is accessed locally using:

```text
http://localhost:5000/api/products
```

---

# 12. Main API Routes

## Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/auth/test-admin
```

---

## Users

```text
/api/users
```

---

## Categories

```text
/api/categories
```

---

## Products

```text
/api/products
```

---

## Batches

```text
/api/batches
```

---

## Cart

```text
/api/cart
```

---

## Orders

```text
/api/orders
```

---

## Inventory

```text
/api/inventory
```

---

## Coupons

```text
/api/coupons
```

---

## Subscriptions

```text
/api/subscriptions
```

---

## Bundles

```text
/api/bundles
```

---

## Shipments

```text
/api/shipments
```

---

## Tracking

```text
/api/tracking
```

---

## Brand Owner

```text
/api/brand-owner
```

---

## Merchant

```text
/api/merchant
```

---

## Administration

```text
/api/admin
```

---

## Compliance

```text
/api/compliance
```

---

## Tenants

```text
/api/tenants
```

---

## Integrations

```text
/api/admin/integrations
```

---

## Webhooks

```text
/api/webhooks/:provider
```

---

# 13. Requirements

Before running the backend, install:

### Node.js

Recommended:

```text
Node.js 22+
```

Check:

```powershell
node --version
```

Example:

```text
v22.16.0
```

---

### npm

Check:

```powershell
npm --version
```

---

### MongoDB

MongoDB Server is required.

The local development database used by this project is:

```text
fitbrand
```

Default local connection:

```text
mongodb://127.0.0.1:27017/fitbrand
```

---

# 14. Installation

Clone or download the repository.

Move into the backend directory:

```powershell
cd backend
```

Install dependencies:

```powershell
npm install
```

This installs all packages listed in `package.json`.

---

# 15. Environment Configuration

Create a file named:

```text
.env
```

in the backend root directory.

Example:

```env
PORT=5000

MONGODB_URI=mongodb://127.0.0.1:27017/fitbrand

JWT_SECRET=replace_with_a_strong_random_secret

NODE_ENV=development

CORS_ORIGIN=http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300

WEBHOOK_SECRET=replace_with_a_strong_webhook_secret
```

### Important

Never commit the actual `.env` file.

The repository contains:

```text
.env.example
```

instead.

Use `.env.example` as the template for local configuration.

---

# 16. Starting MongoDB

For a local MongoDB installation, make sure MongoDB is running.

Example:

```powershell
mongod --dbpath C:\data\db
```

The exact MongoDB command may be different depending on how MongoDB was installed.

Verify that MongoDB is running before starting the backend.

---

# 17. Starting the Backend

For normal execution:

```powershell
npm start
```

For development with Nodemon:

```powershell
npm run dev
```

A successful startup should display something similar to:

```text
MongoDB connected successfully ✅
FITBRAND API running on http://localhost:5000
Environment: development
```

---

# 18. Testing the Root API

Open:

```text
http://localhost:5000/
```

Expected response:

```json
{
  "message": "FITBRAND API is running 🚀"
}
```

---

# 19. Authentication Example

## Register

Endpoint:

```text
POST /api/auth/register
```

Example request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9999999999",
  "password": "Password@123"
}
```

---

## Login

Endpoint:

```text
POST /api/auth/login
```

Example:

```json
{
  "email": "john@example.com",
  "password": "Password@123"
}
```

The response contains a JWT token.

Example:

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9999999999",
    "role": "customer"
  }
}
```

---

# 20. Using Protected APIs

For protected APIs, send the JWT token using:

```text
Authorization: Bearer <token>
```

Example:

```text
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

Without a valid token, protected endpoints return:

```text
401 Unauthorized
```

---

# 21. Role-Based Authorization

The backend uses role-based middleware.

Available roles:

```text
customer
brand_owner
operations
admin
```

For example, an endpoint can require:

```text
admin
```

Only users with the required role can access that endpoint.

If a logged-in user does not have permission, the API returns:

```text
403 Forbidden
```

---

# 22. Error Handling

The backend provides a central error-handling system.

Common HTTP responses include:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
413 Payload Too Large
500 Internal Server Error
```

A request to a non-existing route returns:

```json
{
  "message": "Route not found"
}
```

---

# 23. Development Tools

Recommended tools for development:

* Visual Studio Code
* MongoDB Compass
* PowerShell
* Git
* Node.js
* npm

API requests can be tested using:

* PowerShell
* `Invoke-RestMethod`
* `Invoke-WebRequest`
* Postman
* Thunder Client
* Any REST API client

---

# 24. Verification

The backend was developed in multiple implementation phases.

The completed phases are:

```text
Phase 01 - Foundation                         ✅
Phase 02 - Authentication & Users             ✅
Phase 03 - Products & Categories              ✅
Phase 04 - Batch & COA                        ✅
Phase 05 - Cart                                ✅
Phase 06 - Checkout & Orders                  ✅
Phase 07 - Inventory                           ✅
Phase 08 - Coupons & Discounts                ✅
Phase 09 - Subscriptions & Bundles            ✅
Phase 10 - Logistics                           ✅
Phase 11 - Merchant / Brand Owner APIs        ✅
Phase 12 - Operations / Admin                 ✅
Phase 13 - Compliance                          ✅
Phase 14 - Multi-Tenant / White-Label         ✅
Phase 15 - External Integrations              ✅
Phase 16 - Security & Production              ✅
```

---

# 25. Phase 16 Security Verification

The final Phase 16 verification completed successfully.

Result:

```text
Passed : 14
Failed : 0
```

The following security checks passed:

```text
Root API
Helmet security headers
X-Powered-By disabled
Operations authentication
Unauthenticated API protection
Invalid JWT rejection
404 handling
1 MB JSON request limit
Secure webhook integration
Unsigned webhook rejection
Invalid webhook signature rejection
Malformed webhook signature rejection
Valid HMAC webhook verification
Rate limiting
```

The rate limiter was verified with:

```text
300 requests / 15 minutes
```

and returned rate-limit headers.

---

# 26. Database

The application uses MongoDB.

Database:

```text
fitbrand
```

Main collections are created by Mongoose models.

Examples include:

```text
users
products
categories
batches
carts
orders
inventories
coupons
subscriptions
bundles
shipments
tenants
integrations
```

The exact collection names are controlled by Mongoose.

MongoDB Compass can be used to inspect the database during development.

---

# 27. Security and Secrets

The following values must remain private:

```text
.env
JWT_SECRET
WEBHOOK_SECRET
Database credentials
Production API keys
Payment provider secrets
Shipping provider secrets
Webhook provider secrets
```

Do not place secret values inside:

* source code
* README.md
* screenshots
* Git commits
* public repositories

Use environment variables instead.

---

# 28. Production Considerations

Before deploying this backend to a real production environment, update the configuration.

At minimum:

### Use strong secrets

Generate strong random values for:

```text
JWT_SECRET
WEBHOOK_SECRET
```

Do not use development placeholder values.

---

### Use a production MongoDB instance

Replace the local connection:

```text
mongodb://127.0.0.1:27017/fitbrand
```

with the production MongoDB connection string.

---

### Configure production CORS

Do not leave development origins configured for a production deployment.

For example:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

---

### Use HTTPS

Production traffic should be protected with HTTPS.

---

### Configure reverse proxy

When running behind a reverse proxy or load balancer, configure the Express proxy settings appropriately.

The application already enables:

```text
trust proxy
```

when:

```env
NODE_ENV=production
```

---

### Use real external integrations

Payment, shipping, analytics, and other integrations should use real provider credentials stored securely as environment variables or through a secure secret-management system.

---

# 29. Multi-Tenant Production Considerations

The current tenant implementation is a foundation.

For complete production-grade multi-tenancy, additional work should include:

* Tenant-aware queries
* Tenant-aware authorization
* Tenant-aware order access
* Tenant-aware inventory access
* Tenant-aware cart access
* Tenant-aware subscription access
* Tenant-aware coupon access
* Tenant-aware reporting
* Tenant-aware administration
* Cross-tenant access prevention
* Tenant-specific configuration
* Tenant-specific integration credentials

These should be implemented before claiming complete tenant isolation.

---

# 30. Future Improvements

Possible future improvements include:

* Payment gateway integration
* Real shipping provider integration
* Email notifications
* SMS notifications
* Refresh-token authentication
* Password reset
* Email verification
* Advanced product search
* Product reviews and ratings
* Wishlist
* Advanced analytics
* Redis caching
* Background job processing
* Automated webhook event processing
* API documentation with Swagger/OpenAPI
* Automated unit tests
* Automated integration tests
* CI/CD pipeline
* Production logging
* Monitoring and alerting
* Complete tenant isolation
* Cloud deployment
* Secure secret management

---

# 31. Git Safety

The repository intentionally ignores:

```text
.env
node_modules/
logs/
coverage/
temporary files
local database files
IDE-specific files
```

The following file is safe to commit as a configuration template:

```text
.env.example
```

Before committing, always verify:

```powershell
git status
```

Make sure `.env` is not listed as a file to be committed.

---

# 32. Useful Commands

Install dependencies:

```powershell
npm install
```

Start backend:

```powershell
npm start
```

Start development server:

```powershell
npm run dev
```

Check Git status:

```powershell
git status
```

Check code formatting issues detected by Git:

```powershell
git diff --check
```

Check current branch:

```powershell
git branch --show-current
```

Check remote repository:

```powershell
git remote -v
```

---

# 33. Project Status

The FITBRAND backend implementation is complete through **Phase 16**.

All planned implementation phases have been completed and verified.

Final Phase 16 security verification:

```text
14 Passed
0 Failed
```

The backend is ready for the final repository cleanup, Git review, commit, and push.

---

## License

This project was created as part of a development assignment.

Add the appropriate license here if the project is later released as open source.
