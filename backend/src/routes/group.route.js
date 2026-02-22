import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, getGroups, getGroupMessages, sendGroupMessage, addMember, removeMember } from "../controllers/group.controller.js";

const router = express.Router();

router.get("/", protectRoute, getGroups);
router.post("/create", protectRoute, createGroup);
router.get("/messages/:id", protectRoute, getGroupMessages);
router.post("/send/:id", protectRoute, sendGroupMessage);
router.post("/add-member", protectRoute, addMember);
router.post("/remove-member", protectRoute, removeMember);

export default router;
