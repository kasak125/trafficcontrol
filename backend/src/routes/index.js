import { Router } from "express";
import trafficRoutes from "./trafficRoutes.js";
import { getRedisClient } from "../config/redis.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      cache: getRedisClient() ? "connected" : "disabled",
    },
  });
});

router.use("/traffic", trafficRoutes);

export default router;
