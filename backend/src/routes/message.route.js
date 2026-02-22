import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, deleteMessage, editMessage, addContact, markMessagesAsSeen, toggleStarMessage, togglePinMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.post("/add", protectRoute, addContact);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.put("/:id", protectRoute, editMessage);

router.post("/seen/:id", protectRoute, markMessagesAsSeen);
router.post("/star/:id", protectRoute, toggleStarMessage);
router.post("/pin/:id", protectRoute, togglePinMessage);

export default router;
