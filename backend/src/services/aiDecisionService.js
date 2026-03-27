import { EmergencyStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getTrafficState } from "./trafficStateStore.js";
import { getParkingAvailability } from "./parkingAvailabilityService.js";

function buildSeverity(score) {
  if (score >= 85) {
    return "critical";
  }

  if (score >= 65) {
    return "high";
  }

  if (score >= 40) {
    return "medium";
  }

  return "low";
}

function buildConfidence(score) {
  return Math.min(98, Math.max(62, Math.round(score)));
}

export async function getAiDecisionFeed() {
  const state = getTrafficState();
  const [activeEmergencies, parkingState, recentOptimizations] = await Promise.all([
    prisma.emergencyVehicle.findMany({
      where: { status: EmergencyStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
      take: 3,
      include: {
        signalControlLogs: {
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            intersection: true,
          },
        },
      },
    }),
    getParkingAvailability(),
    prisma.optimizationLog.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
    }),
  ]);

  const decisions = [];
  const congestedIntersections = [...state.flow]
    .sort((left, right) => right.congestionLevel - left.congestionLevel)
    .slice(0, 3);
  const laneSensorsActive = state.flow.reduce(
    (sum, item) => sum + (item.meta?.laneBreakdown?.length ?? 0),
    0,
  );
  const optimizedIntersections = state.flow.filter((item) => item.optimized).length;

  activeEmergencies.forEach((vehicle) => {
    const overrideCount = vehicle.signalControlLogs.length;
    const score = 88 + overrideCount * 2;

    decisions.push({
      id: `emergency-${vehicle.id}`,
      type: "green-corridor",
      title: `${vehicle.type.toLowerCase()} priority corridor active`,
      severity: "critical",
      confidence: buildConfidence(score),
      rationale: `Emergency ETA is ${vehicle.eta}s. Keep downstream intersections green to preserve response time.`,
      recommendation:
        overrideCount > 0
          ? `Maintain ${overrideCount} active signal overrides and continue adaptive progression.`
          : "Pre-stage nearby intersections for emergency approach.",
      intersections: vehicle.signalControlLogs.map((log) => log.intersection.name),
      updatedAt: vehicle.updatedAt,
    });
  });

  congestedIntersections.forEach((intersection, index) => {
    const score = intersection.congestionLevel + intersection.avgWaitTime / 2 + index * 3;

    decisions.push({
      id: `traffic-${intersection.intersectionId}-${index}`,
      type: "adaptive-signal",
      title: `Rebalance signal timing at ${intersection.intersectionName}`,
      severity: buildSeverity(score),
      confidence: buildConfidence(score),
      rationale: `Congestion is ${intersection.congestionLevel}% with ${intersection.avgWaitTime}s average wait.`,
      recommendation:
        intersection.congestionLevel > 70
          ? "Extend green phase for the dominant direction and hold cross-traffic for one cycle."
          : "Apply incremental phase offset changes and monitor for the next 10 minutes.",
      intersections: [intersection.intersectionName],
      updatedAt: state.lastUpdated ?? new Date().toISOString(),
    });
  });

  const strainedLots = parkingState.lots.filter((lot) => lot.availableSlots < 60).slice(0, 2);
  strainedLots.forEach((lot) => {
    const score = lot.occupancyRate;

    decisions.push({
      id: `parking-${lot.id}`,
      type: "parking-redistribution",
      title: `Redirect vehicles away from ${lot.area}`,
      severity: buildSeverity(score),
      confidence: buildConfidence(score - 4),
      rationale: `${lot.name} is down to ${lot.availableSlots} available slots with ${lot.occupancyRate}% occupancy.`,
      recommendation: `Promote alternate parking inventory and signage before ${lot.area} gridlock worsens.`,
      intersections: [lot.linkedIntersection],
      updatedAt: lot.updatedAt,
    });
  });

  const featureStatus = [
    {
      id: "traffic-input",
      title: "Traffic Data Input",
      status: laneSensorsActive > 0 ? "active" : "fallback",
      detail:
        laneSensorsActive > 0
          ? `${laneSensorsActive} lane-level camera/sensor channels feeding vehicle counts`
          : "Intersection-level fallback feed active",
      metric: `${state.flow.length} intersections`,
    },
    {
      id: "ai-analysis",
      title: "AI Analysis",
      status: decisions.length ? "active" : "standby",
      detail: `Density scoring and adaptive recommendations generated from ${state.source} traffic state`,
      metric: `${decisions.length} recommendations`,
    },
    {
      id: "dynamic-signal",
      title: "Dynamic Signal Timing",
      status: optimizedIntersections > 0 ? "active" : "monitoring",
      detail:
        optimizedIntersections > 0
          ? `Green phase tuning is active at ${optimizedIntersections} intersections`
          : "Signal timing engine is monitoring for congestion spikes",
      metric: `${recentOptimizations} optimizations / 10 min`,
    },
    {
      id: "real-time-control",
      title: "Real-Time Control",
      status: state.lastUpdated ? "active" : "offline",
      detail:
        state.lastUpdated
          ? `Control loop is updating from ${state.source} telemetry every cycle`
          : "Control loop awaiting live traffic state",
      metric: state.lastUpdated ? "Loop online" : "Offline",
    },
    {
      id: "emergency-priority",
      title: "Emergency Vehicle Priority",
      status: activeEmergencies.length ? "active" : "ready",
      detail:
        activeEmergencies.length
          ? "Green corridor overrides are active for emergency routing"
          : "Priority corridor engine is armed for ambulance and fire dispatch",
      metric: `${activeEmergencies.length} active routes`,
    },
  ];

  return {
    source: state.source,
    generatedAt: new Date().toISOString(),
    analysisMethod: "hybrid-density-scoring",
    summary: {
      activeEmergencies: activeEmergencies.length,
      liveIntersections: state.flow.length,
      incidents: state.incidents.length,
      recommendations: decisions.length,
    },
    featureStatus,
    decisions: decisions.slice(0, 6),
  };
}
