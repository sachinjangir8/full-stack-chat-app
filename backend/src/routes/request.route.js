import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { sendRequest, getRequests, acceptRequest, rejectRequest } from "../controllers/request.controller.js";

const router = express.Router();

router.post("/send", protectRoute, sendRequest);
router.get("/get", protectRoute, getRequests);
router.post("/accept", protectRoute, acceptRequest);
router.post("/reject", protectRoute, rejectRequest);

export default router;
