const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: String,
  roomName: String,
  createdBy: String,
  participants: [String],
  code: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Room", RoomSchema);