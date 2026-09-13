const User = require("../models/User");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          message: "Name must contain at least 2 characters",
        });
      }

      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone ? phone.trim() : null;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    res.status(500).json({
      message: "Server error while updating profile",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
