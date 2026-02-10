import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { updateLocation, getNearbyUsers } from "../controllers/location.controller.js";

const router = express.Router();

router.put("/update", protectRoute, updateLocation);
router.get("/nearby", protectRoute, getNearbyUsers);

export default router;
