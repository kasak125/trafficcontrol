import {
  getTrafficSummary,
  getTrafficTrends,
  getTrafficWaitTimes,
} from "../services/trafficQueryService.js";
import {
  getLiveTrafficOverview,
  getTrafficIncidents,
} from "../services/trafficLiveService.js";

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

export async function getLiveTrafficController(_req, res) {
  const data = await getLiveTrafficOverview();
  res.json({
    success: true,
    data,
  });
}

export async function getTrafficIncidentsController(_req, res) {
  const data = await getTrafficIncidents();
  res.json({
    success: true,
    data,
  });
}
