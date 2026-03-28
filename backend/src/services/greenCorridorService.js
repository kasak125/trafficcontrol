import { SignalActionType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { SIGNAL_OVERRIDE_EVENT, trafficEventBus } from "../events/trafficEventBus.js";
import { getTrafficState, pushSystemAction } from "./trafficStateStore.js";
import { decodeLocation, haversineDistanceMeters } from "../utils/geo.js";

function getRecentOverrideWindow() {
  return new Date(Date.now() - 30 * 1000);
}

function routeIndexForIntersection(routePoints, location) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  routePoints.forEach((point, index) => {
    const distance = haversineDistanceMeters(point, location);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return { closestIndex, closestDistance };
}

export async function applyGreenCorridor({ emergencyVehicle, currentLocation, routePoints }) {
  const intersections = await prisma.intersection.findMany();
  const liveTraffic = getTrafficState();
  const currentPoint = decodeLocation(currentLocation);
  const currentRouteMatch = routeIndexForIntersection(routePoints, currentPoint);

  const upcomingIntersections = intersections
    .map((intersection) => {
      const location = decodeLocation(intersection.location);
      const routeMatch = routeIndexForIntersection(routePoints, location);

      return {
        intersection,
        routeIndex: routeMatch.closestIndex,
        routeDistance: routeMatch.closestDistance,
      };
    })
    .filter(
      (candidate) =>
        candidate.routeIndex >= currentRouteMatch.closestIndex &&
        candidate.routeDistance <= 700,
    )
    .sort((left, right) => left.routeIndex - right.routeIndex)
    .slice(0, 4);

  const overrides = [];

  for (const candidate of upcomingIntersections) {
    const existingOverride = await prisma.signalControlLog.findFirst({
      where: {
        emergencyVehicleId: emergencyVehicle.id,
        intersectionId: candidate.intersection.id,
        createdAt: {
          gte: getRecentOverrideWindow(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingOverride) {
      continue;
    }

    const liveMatch = liveTraffic.flow.find(
      (item) => item.intersectionId === candidate.intersection.id,
    );
    const congestionLevel = liveMatch?.congestionLevel ?? null;
    const reason =
      congestionLevel !== null && congestionLevel >= env.emergencyCongestionThreshold
        ? "Congested route detected; extending green phase for emergency corridor."
        : "Proactively clearing signal approach for emergency corridor.";
    const waitTimeOverride =
      congestionLevel !== null && congestionLevel >= env.emergencyCongestionThreshold ? 12 : 20;

    const signalLog = await prisma.signalControlLog.create({
      data: {
        intersectionId: candidate.intersection.id,
        emergencyVehicleId: emergencyVehicle.id,
        action: SignalActionType.GREEN_CORRIDOR,
        waitTimeOverride,
        reason,
        congestionLevel,
        expiresAt: new Date(Date.now() + 45 * 1000),
        metadata: {
          routeIndex: candidate.routeIndex,
          currentVehicleProgress: emergencyVehicle.progress,
        },
      },
    });

    const payload = {
      signalControlLogId: signalLog.id,
      emergencyVehicleId: emergencyVehicle.id,
      intersectionId: candidate.intersection.id,
      intersectionName: candidate.intersection.name,
      location: candidate.intersection.location,
      action: signalLog.action,
      reason,
      waitTimeOverride,
      congestionLevel,
      createdAt: signalLog.createdAt,
      expiresAt: signalLog.expiresAt,
    };

    overrides.push(payload);
    pushSystemAction({
      type: "signal-override",
      message: `${candidate.intersection.name} set to green corridor mode`,
      createdAt: signalLog.createdAt,
      emergencyVehicleId: emergencyVehicle.id,
    });
    trafficEventBus.emit(SIGNAL_OVERRIDE_EVENT, payload);
  }

  if (overrides.length) {
    logger.info("Green corridor overrides applied", {
      emergencyVehicleId: emergencyVehicle.id,
      count: overrides.length,
    });
  }

  return overrides;
}
