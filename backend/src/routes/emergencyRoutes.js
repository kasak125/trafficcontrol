import { Router } from "express";
import {
  getActiveEmergencyController,
  getEmergencyHistoryController,
  startEmergencyController,
} from "../controllers/emergencyController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  emergencyActiveQuerySchema,
  emergencyHistoryQuerySchema,
  emergencyStartSchema,
} from "../validators/emergencySchemas.js";

const router = Router();

router.post("/start", validateRequest(emergencyStartSchema), asyncHandler(startEmergencyController));
router.get(
  "/active",
  validateRequest(emergencyActiveQuerySchema),
  asyncHandler(getActiveEmergencyController),
);
router.get(
  "/history",
  validateRequest(emergencyHistoryQuerySchema),
  asyncHandler(getEmergencyHistoryController),
);

export default router;
