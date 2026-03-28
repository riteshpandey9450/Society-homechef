const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
    // Reduce ping overhead — we use minimal events
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client joins a user-specific room immediately after connecting
    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`👤 ${userId} joined user room`);
    });

    // Client also joins a role room (chef / customer / rider)
    socket.on("joinRole", (role) => {
      if (!role) return;
      socket.join(`role:${role}`);
      console.log(`🏷️  Joined role:${role}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

/** Emit to a single user by their MongoDB _id string */
const emitToUser = (userId, event, data) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, data);
};

/** Emit to all sockets in a given role room */
const emitToRole = (role, event, data) => {
  if (io && role) io.to(`role:${role}`).emit(event, data);
};

/** Emit to all online riders (convenience wrapper) */
const emitToRiders = (event, data) => emitToRole("rider", event, data);

/** Emit to all online chefs (convenience wrapper) */
const emitToChefs = (event, data) => emitToRole("chef", event, data);

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToRiders,
  emitToChefs,
};
