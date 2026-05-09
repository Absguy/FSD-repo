const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const Room = require("../models/room");
const User = require("../models/user");

// Admin: list rooms (for monitoring)
router.get("/rooms", auth, requireAdmin, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch rooms" });
  }
});

// Admin: list users
router.get("/users", auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch users" });
  }
});

// Admin: delete user
router.delete("/users/:userId", auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Enforce deletion hierarchy
    if (req.user.role === "admin" && targetUser.role !== "user") {
      return res.status(403).json({ message: "Admins can only delete regular users." });
    }
    if (req.user.role === "superadmin" && targetUser.role === "superadmin") {
      return res.status(403).json({ message: "Superadmins cannot delete other superadmins." });
    }

    await User.deleteOne({ _id: userId });
    res.json({ ok: true, userId });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete user" });
  }
});

// Admin: delete any room
router.delete("/rooms/:roomId", auth, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    await Room.deleteOne({ roomId });
    res.json({ ok: true, roomId });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete room" });
  }
});

module.exports = router;

