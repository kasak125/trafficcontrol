import { IntersectionStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";

function calculateOptimizedWaitTime(avgWaitTime) {
  return Math.max(12, Math.round(avgWaitTime * 0.78));
}

export async function optimizeTrafficLog({ intersection, trafficLog }) {
  if (trafficLog.congestionLevel <= 70) {
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

  const optimizedWaitTime = calculateOptimizedWaitTime(trafficLog.avgWaitTime);
  const action = `Adaptive signal cycle reduced wait time from ${trafficLog.avgWaitTime}s to ${optimizedWaitTime}s`;

  const [updatedLog, updatedIntersection, optimizationLog] = await prisma.$transaction([
    prisma.trafficLog.update({
      where: { id: trafficLog.id },
      data: { avgWaitTime: optimizedWaitTime },
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
        optimizedWaitTime,
        congestionLevel: trafficLog.congestionLevel,
      },
    }),
  ]);

  return {
    optimized: true,
    optimizedWaitTime: updatedLog.avgWaitTime,
    intersectionStatus: updatedIntersection.status,
    optimizationLogId: optimizationLog.id,
    action: optimizationLog.action,
  };
}
