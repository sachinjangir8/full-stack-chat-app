import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import locationRoutes from "./routes/location.route.js";
import requestRoutes from "./routes/request.route.js";
import callRoutes from "./routes/call.route.js";
import groupRoutes from "./routes/group.route.js";
import discoveryRoutes from "./routes/discovery.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" }));
app.set("trust proxy", 1);
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://full-stack-chat-app-2-frontend.onrender.com",
    ],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/discovery", discoveryRoutes);

// In many Render setups, the root is where parent folder is
const projectRoot = path.resolve(__dirname, "../../");

console.log(`[Server] __dirname: ${__dirname}`);
console.log(`[Server] projectRoot: ${projectRoot}`);
console.log(`[Server] process.cwd(): ${process.cwd()}`);

// Debug: List directory content to see where we are on Render
try {
  console.log(`[Server] Contents of ${projectRoot}:`, fs.readdirSync(projectRoot));
  const frontendPath = path.join(projectRoot, "frontend");
  if (fs.existsSync(frontendPath)) {
    console.log(`[Server] Contents of ${frontendPath}:`, fs.readdirSync(frontendPath));
  }
} catch (e) {
  console.log("[Server] Could not list directories:", e.message);
}

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(projectRoot, "frontend/dist");
  const indexPath = path.join(distPath, "index.html");

  console.log(`[Server] Checking distPath: ${distPath}`);

  if (fs.existsSync(distPath)) {
    console.log("[Server] Found distPath. Serving static files.");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ message: "Frontend build not found. Please build the frontend." });
      }
    });
  } else {
    // Try one more common Render path if the monorepo structure is flattened
    const altDistPath = path.join(process.cwd(), "frontend/dist");
    console.log(`[Server] distPath not found. Checking altDistPath: ${altDistPath}`);

    if (fs.existsSync(altDistPath)) {
      console.log("[Server] Found altDistPath. Serving static files.");
      app.use(express.static(altDistPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(altDistPath, "index.html"));
      });
    } else {
      console.warn(`[Server] Production Mode: Frontend dist not found. API only mode enabled.`);
      app.get("/", (req, res) => res.status(200).json({ message: "Chat App API is running. Frontend build missing." }));
    }
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Server] Unhandled Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
