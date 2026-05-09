const router = require("express").Router();
const Room = require("../models/room");
const { randomUUID } = require("crypto");
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const { body, validationResult } = require("express-validator");

// Create Room
router.post("/create", auth, [
  body('roomName').isString().isLength({ min: 3 }).withMessage('Room name must be at least 3 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const room = new Room({
    roomId: randomUUID(),
    roomName: req.body.roomName,
    createdBy: req.user.id,
    participants: [req.user.id]
  });

  await room.save();
  res.json(room);
});

// Join Room
router.post("/join", auth, [
  body('roomId').isString().notEmpty().withMessage('Room ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const room = await Room.findOne({ roomId: req.body.roomId });

  if (!room) return res.status(404).json("Room not found");

  if (!room.participants.includes(req.user.id)) {
    room.participants.push(req.user.id);
    await room.save();
  }

  res.json(room);
});

// Get Room Details (Public/Guest accessible for checking existence before socket join)
router.get("/info/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Get User's Rooms
router.get("/list/:userId", auth, async (req, res) => {
  try {
    // Find all rooms where the user is a participant
    const rooms = await Room.find({ participants: req.params.userId }).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete Room (only creator can delete)
router.delete("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    // Admin can delete any room; otherwise only creator
    if (req.user?.role !== "admin" && String(room.createdBy) !== String(userId)) {
      return res.status(403).json({ message: "Only the creator can delete this room" });
    }

    await Room.deleteOne({ roomId });
    res.json({ ok: true, roomId });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete room" });
  }
});

// Admin-only: delete any room (explicit endpoint)
router.delete("/admin/:roomId", auth, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    await Room.deleteOne({ roomId });
    res.json({ ok: true, roomId });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete room" });
  }
});

module.exports = router;
