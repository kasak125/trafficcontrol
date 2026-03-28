import { Router } from "express";
import { getCvDensityController, postCvDensityController } from "../controllers/cvController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { cvDensityCreateSchema, cvDensityQuerySchema } from "../validators/cvSchemas.js";

const router = Router();

router.get("/density", validateRequest(cvDensityQuerySchema), asyncHandler(getCvDensityController));
router.post(
  "/density",
  validateRequest(cvDensityCreateSchema),
  asyncHandler(postCvDensityController),
);

export default router;
