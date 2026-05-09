module.exports = function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Access Denied" });
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Admin or Superadmin only" });
  }
  next();
};

