const express = require("express");

const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

router.get("/test-admin", protect, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({
    message: "Admin access granted ✅",
    role: req.user.role,
  });
});

module.exports = router;
