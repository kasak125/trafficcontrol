import { getAiDecisionFeed } from "../services/aiDecisionService.js";
import { getParkingAvailability } from "../services/parkingAvailabilityService.js";

export async function getAiDecisionsController(_req, res) {
  const data = await getAiDecisionFeed();
  res.json({
    success: true,
    data,
  });
}

export async function getParkingAvailabilityController(_req, res) {
  const data = await getParkingAvailability();
  res.json({
    success: true,
    data,
  });
}
