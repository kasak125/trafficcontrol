import { prisma } from "../config/prisma.js";
import { buildBoundingBox, decodeLocation } from "../utils/geo.js";
import { getTrafficState } from "./trafficStateStore.js";
import { tomTomTrafficService } from "./tomTomTrafficService.js";

export async function getLiveTrafficOverview() {
  const state = getTrafficState();

  return {
    source: state.source,
    lastUpdated: state.lastUpdated,
    intersections: state.flow,
    incidentCount: state.incidents.length,
    recentActions: state.actions,
  };
}

export async function getTrafficIncidents() {
  const state = getTrafficState();
  if (state.incidents.length > 0) {
    return {
      source: state.source,
      lastUpdated: state.lastUpdated,
      incidents: state.incidents,
    };
  }

  if (!tomTomTrafficService.isConfigured()) {
    return {
      source: "simulation",
      lastUpdated: new Date().toISOString(),
      incidents: [],
    };
  }

  const intersections = await prisma.intersection.findMany();
  const bbox = buildBoundingBox(intersections.map((intersection) => decodeLocation(intersection.location)));
  const incidentResult = await tomTomTrafficService.fetchIncidents(bbox);

  return {
    source: incidentResult.success ? "tomtom" : "simulation",
    lastUpdated: new Date().toISOString(),
    incidents: incidentResult.success ? incidentResult.data : [],
  };
}
