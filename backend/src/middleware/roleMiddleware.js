const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication middleware should run before this middleware
    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized. Please login first.",
      });
    }

    // Check whether user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission for this resource.",
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
