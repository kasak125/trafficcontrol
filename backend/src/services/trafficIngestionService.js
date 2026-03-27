import {
  TRAFFIC_CONGESTION_EVENT,
  TRAFFIC_UPDATE_EVENT,
  TRAFFIC_WAIT_TIME_EVENT,
  trafficEventBus,
} from "../events/trafficEventBus.js";
import { prisma } from "../config/prisma.js";
import { optimizeTrafficLog } from "./optimizationService.js";

export async function recordTrafficSnapshot({
  intersection,
  metrics,
  timestamp = new Date(),
  source = "simulated",
  meta = null,
}) {
  const trafficLog = await prisma.trafficLog.create({
    data: {
      intersectionId: intersection.id,
      vehicleCount: metrics.vehicleCount,
      congestionLevel: metrics.congestionLevel,
      avgWaitTime: metrics.avgWaitTime,
      timestamp,
      source,
      meta,
    },
  });

  const optimization = await optimizeTrafficLog({ intersection, trafficLog });
  const payload = {
    intersectionId: intersection.id,
    intersectionName: intersection.name,
    location: intersection.location,
    status: optimization.intersectionStatus,
    vehicleCount: trafficLog.vehicleCount,
    congestionLevel: trafficLog.congestionLevel,
    avgWaitTime: optimization.optimizedWaitTime,
    optimized: optimization.optimized,
    optimizationAction: optimization.action ?? null,
    source,
    meta,
    timestamp,
  };

  trafficEventBus.emit(TRAFFIC_UPDATE_EVENT, payload);
  trafficEventBus.emit(TRAFFIC_WAIT_TIME_EVENT, {
    intersectionId: payload.intersectionId,
    intersectionName: payload.intersectionName,
    avgWaitTime: payload.avgWaitTime,
    optimized: payload.optimized,
    timestamp,
  });

  if (payload.congestionLevel > 70) {
    trafficEventBus.emit(TRAFFIC_CONGESTION_EVENT, {
      intersectionId: payload.intersectionId,
      intersectionName: payload.intersectionName,
      congestionLevel: payload.congestionLevel,
      status: payload.status,
      timestamp,
    });
  }

  return payload;
}
