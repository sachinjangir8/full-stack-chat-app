import { Server } from "socket.io";
import http from "http";
import express from "express";
import Call from "../models/call.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://full-stack-chat-app-2-frontend.onrender.com",
    ],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User ${userId} joined group ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`User ${userId} left group ${groupId}`);
  });

  socket.on("typing", ({ receiverId, isGroup }) => {
    if (isGroup) {
      socket.to(`group_${receiverId}`).emit("typing", { userId, groupId: receiverId });
    } else {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", userId);
      }
    }
  });

  socket.on("stop-typing", ({ receiverId, isGroup }) => {
    if (isGroup) {
      socket.to(`group_${receiverId}`).emit("stop-typing", { userId, groupId: receiverId });
    } else {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop-typing", userId);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("callUser", async (data) => {
    const receiverSocketId = getReceiverSocketId(data.userToCall);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callUser", {
        signal: data.signalData,
        from: data.from,
        name: data.name,
      });
    } else {
      // User is offline, log missed call
      try {
        const newCall = new Call({
          callerId: data.from._id || data.from, // Handle populate or raw ID
          receiverId: data.userToCall,
          status: "missed",
          type: "video"
        });
        await newCall.save();
      } catch (error) {
        console.error("Error logging missed call:", error);
      }
    }
  });

  socket.on("answerCall", (data) => {
    const receiverSocketId = getReceiverSocketId(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callAccepted", data.signal);
    }
  });

  socket.on("ice-candidate", (data) => {
    const receiverSocketId = getReceiverSocketId(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", data.candidate);
    }
  });

  socket.on("endCall", (data) => {
    const receiverSocketId = getReceiverSocketId(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callEnded");
    }
  });
});

export { io, app, server };
