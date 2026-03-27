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
  const [activeEmergencies, parkingState] = await Promise.all([
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
  ]);

  const decisions = [];
  const congestedIntersections = [...state.flow]
    .sort((left, right) => right.congestionLevel - left.congestionLevel)
    .slice(0, 3);

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

  return {
    source: state.source,
    generatedAt: new Date().toISOString(),
    summary: {
      activeEmergencies: activeEmergencies.length,
      liveIntersections: state.flow.length,
      incidents: state.incidents.length,
      recommendations: decisions.length,
    },
    decisions: decisions.slice(0, 6),
  };
}
