const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const { Server } = require("socket.io");
require("dotenv").config();
const Room = require("./models/room");

const app = express();
const server = http.createServer(app);

// Trust the reverse proxy (Render) so rate limiting works correctly with real IPs
app.set("trust proxy", 1);

const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(helmet()); // Secure HTTP headers (includes HSTS)
app.use(express.json());
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS by sanitizing input

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api/", limiter);

const users = {};

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/codecollab")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/room", require("./routes/room"));
app.use("/api/admin", require("./routes/admin"));

// In-memory room state for low-latency collaboration + periodic persistence
const roomState = new Map(); // roomId -> { code, version, dirty, lastSavedAt }
const getOrInitRoomState = async (roomId) => {
  let state = roomState.get(roomId);
  if (state) return state;

  const room = await Room.findOne({ roomId }).lean();
  state = {
    code: room?.code || "",
    version: 0,
    dirty: false,
    lastSavedAt: Date.now()
  };
  roomState.set(roomId, state);
  return state;
};

const AUTOSAVE_INTERVAL_MS = Number(process.env.AUTOSAVE_INTERVAL_MS || 5000);
setInterval(async () => {
  const saves = [];
  for (const [roomId, state] of roomState.entries()) {
    if (!state.dirty) continue;
    state.dirty = false;
    state.lastSavedAt = Date.now();
    saves.push(
      Room.updateOne({ roomId }, { $set: { code: state.code } }).catch(() => {
        // Mark dirty again so the next interval retries
        state.dirty = true;
      })
    );
  }
  if (saves.length) await Promise.allSettled(saves);
}, AUTOSAVE_INTERVAL_MS);

// SOCKET.IO auth (registered user via JWT; otherwise guest)
const jwt = require("jsonwebtoken");
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.token ||
      (typeof socket.handshake.headers?.authorization === "string" &&
      socket.handshake.headers.authorization.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice("Bearer ".length)
        : null);

    if (!token) {
      socket.user = { role: "guest", name: "Guest" };
      return next();
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: verified.id, role: verified.role || "user", name: verified.name || "User" };
    return next();
  } catch (e) {
    socket.user = { role: "guest", name: "Guest" };
    return next();
  }
});

// SOCKET.IO
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("joinRoom", async ({ roomId, username }) => {
    socket.join(roomId);
    const displayName = username || socket.user?.name || "Guest";

    // 🔥 Add user to room
    if (!users[roomId]) users[roomId] = [];
    // Only push if not already in the room
    if (!users[roomId].find(u => u.id === socket.id)) {
      users[roomId].push({ id: socket.id, username: displayName, role: socket.user?.role || "guest" });
    }

    // 🔥 Send updated user list
    io.to(roomId).emit("roomUsers", users[roomId]);

    // Send latest code snapshot to the joining user
    try {
      const state = await getOrInitRoomState(roomId);
      socket.emit("roomCode", { code: state.code, version: state.version });
    } catch (e) {
      // If room doesn't exist / DB error, just don't block joining
      socket.emit("roomCode", { code: "", version: 0 });
    }
  });

  // --- Admission Logic ---
  socket.on("askToJoin", ({ roomId, username, userId }) => {
    // If no one is in the room (owner is definitely offline), auto-deny
    if (!users[roomId] || users[roomId].length === 0) {
      socket.emit("admissionResponse", { admitted: false, reason: "Owner is offline" });
      return;
    }
    // Forward the request to everyone in the room (the frontend will filter for the owner)
    socket.to(roomId).emit("admissionRequest", { askerSocketId: socket.id, username, userId });
  });

  socket.on("admitDecision", ({ askerSocketId, admitted }) => {
    // Send the decision directly to the waiting user
    io.to(askerSocketId).emit("admissionResponse", { admitted, reason: admitted ? "" : "Denied by owner" });
  });

  socket.on("codeChange", ({ roomId, code }) => {
    if (socket.user?.role === "guest") return; // Guests: no editing
    (async () => {
      const state = await getOrInitRoomState(roomId);
      state.code = code;
      state.version += 1;
      state.dirty = true;
      socket.to(roomId).emit("codeUpdate", { code: state.code, version: state.version });
    })();
  });

  socket.on("codeAutosave", ({ roomId, code }) => {
    if (socket.user?.role === "guest") return;
    (async () => {
      const state = await getOrInitRoomState(roomId);
      if (typeof code === "string" && code !== state.code) {
        state.code = code;
        state.version += 1;
      }
      state.dirty = true;
      socket.emit("autosaveAck", { roomId, version: state.version });
    })();
  });

  socket.on("sendMessage", ({ roomId, message, username }) => {
    io.to(roomId).emit("receiveMessage", { message, username });
  });

  socket.on("disconnect", () => {
    // 🔥 Remove user from all rooms
    for (let roomId in users) {
      users[roomId] = users[roomId].filter(user => user.id !== socket.id);
      io.to(roomId).emit("roomUsers", users[roomId]);
    }

    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
