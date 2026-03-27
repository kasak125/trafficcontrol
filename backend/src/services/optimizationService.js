import { IntersectionStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateSignalPlan({ vehicleCount, congestionLevel, avgWaitTime }) {
  const normalizedVehicleLoad = clamp(vehicleCount / 1400, 0, 1.15);
  const normalizedCongestion = clamp(congestionLevel / 100, 0, 1);
  const baseGreenTime = 20;
  const greenSignalDuration = Math.round(
    clamp(baseGreenTime + normalizedVehicleLoad * 28 + normalizedCongestion * 14, 18, 64),
  );
  const waitReductionFactor = clamp(
    0.1 + normalizedVehicleLoad * 0.16 + normalizedCongestion * 0.14,
    0.12,
    0.38,
  );
  const optimizedWaitTime = Math.max(12, Math.round(avgWaitTime * (1 - waitReductionFactor)));

  return {
    greenSignalDuration,
    optimizedWaitTime,
  };
}

export async function optimizeTrafficLog({ intersection, trafficLog }) {
  const shouldOptimize = trafficLog.congestionLevel > 70 || trafficLog.vehicleCount >= 950;

  if (!shouldOptimize) {
    if (intersection.status === IntersectionStatus.OPTIMIZED) {
      await prisma.intersection.update({
        where: { id: intersection.id },
        data: { status: IntersectionStatus.OPERATIONAL },
      });
    }

    return {
      optimized: false,
      optimizedWaitTime: trafficLog.avgWaitTime,
      intersectionStatus:
        intersection.status === IntersectionStatus.OPTIMIZED
          ? IntersectionStatus.OPERATIONAL
          : intersection.status,
    };
  }

  const signalPlan = calculateSignalPlan({
    vehicleCount: trafficLog.vehicleCount,
    congestionLevel: trafficLog.congestionLevel,
    avgWaitTime: trafficLog.avgWaitTime,
  });
  const action =
    `Green signal duration set to ${signalPlan.greenSignalDuration}s ` +
    `for vehicle count ${trafficLog.vehicleCount}, reducing wait time from ` +
    `${trafficLog.avgWaitTime}s to ${signalPlan.optimizedWaitTime}s`;

  const [updatedLog, updatedIntersection, optimizationLog] = await prisma.$transaction([
    prisma.trafficLog.update({
      where: { id: trafficLog.id },
      data: { avgWaitTime: signalPlan.optimizedWaitTime },
    }),
    prisma.intersection.update({
      where: { id: intersection.id },
      data: { status: IntersectionStatus.OPTIMIZED },
    }),
    prisma.optimizationLog.create({
      data: {
        intersectionId: intersection.id,
        trafficLogId: trafficLog.id,
        action,
        previousWaitTime: trafficLog.avgWaitTime,
        optimizedWaitTime: signalPlan.optimizedWaitTime,
        congestionLevel: trafficLog.congestionLevel,
      },
    }),
  ]);

  return {
    optimized: true,
    optimizedWaitTime: updatedLog.avgWaitTime,
    greenSignalDuration: signalPlan.greenSignalDuration,
    intersectionStatus: updatedIntersection.status,
    optimizationLogId: optimizationLog.id,
    action: optimizationLog.action,
  };
}
