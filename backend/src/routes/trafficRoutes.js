import { Router } from "express";
import {
  getSummaryController,
  getTrendsController,
  getWaitTimesController,
} from "../controllers/trafficController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  summaryQuerySchema,
  trendsQuerySchema,
  waitTimesQuerySchema,
} from "../validators/trafficSchemas.js";

const router = Router();

router.get("/summary", validateRequest(summaryQuerySchema), asyncHandler(getSummaryController));
router.get("/trends", validateRequest(trendsQuerySchema), asyncHandler(getTrendsController));
router.get("/wait-times", validateRequest(waitTimesQuerySchema), asyncHandler(getWaitTimesController));

export default router;
