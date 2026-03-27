import { Router } from "express";
import {
  getAiDecisionsController,
  getParkingAvailabilityController,
} from "../controllers/operationsController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  aiDecisionQuerySchema,
  parkingAvailabilityQuerySchema,
} from "../validators/operationsSchemas.js";

const router = Router();

router.get("/ai/decisions", validateRequest(aiDecisionQuerySchema), asyncHandler(getAiDecisionsController));
router.get(
  "/parking/availability",
  validateRequest(parkingAvailabilityQuerySchema),
  asyncHandler(getParkingAvailabilityController),
);

export default router;
