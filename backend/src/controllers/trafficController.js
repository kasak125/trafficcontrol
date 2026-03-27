import {
  getTrafficSummary,
  getTrafficTrends,
  getTrafficWaitTimes,
} from "../services/trafficQueryService.js";

export async function getSummaryController(req, res) {
  const data = await getTrafficSummary(req.validated.query);
  res.json({
    success: true,
    data,
  });
}

export async function getTrendsController(req, res) {
  const data = await getTrafficTrends(req.validated.query);
  res.json({
    success: true,
    data,
  });
}

export async function getWaitTimesController(req, res) {
  const data = await getTrafficWaitTimes(req.validated.query);
  res.json({
    success: true,
    data,
  });
}
