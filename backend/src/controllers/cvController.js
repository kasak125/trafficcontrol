import { getCvDensityReadings, recordCvDensityReading } from "../services/cvDensityService.js";

export async function postCvDensityController(req, res) {
  const data = recordCvDensityReading(req.validated.body);

  res.status(202).json({
    success: true,
    data,
  });
}

export async function getCvDensityController(_req, res) {
  const data = getCvDensityReadings();

  res.json({
    success: true,
    data,
  });
}
