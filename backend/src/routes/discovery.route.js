import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { searchByInterests } from "../controllers/discovery.controller.js";

const router = express.Router();

router.get("/search", protectRoute, searchByInterests);

export default router;
