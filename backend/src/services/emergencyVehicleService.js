import {
  EmergencyStatus,
  EmergencyVehicleType,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  EMERGENCY_UPDATE_EVENT,
  trafficEventBus,
} from "../events/trafficEventBus.js";
import { pushSystemAction } from "./trafficStateStore.js";
import { tomTomTrafficService } from "./tomTomTrafficService.js";
import {
  decodeLocation,
  haversineDistanceMeters,
  interpolateRoutePosition,
} from "../utils/geo.js";
import { applyGreenCorridor } from "./greenCorridorService.js";

function buildFallbackRoute(origin, destination) {
  const intermediatePoints = 8;
  const steps = intermediatePoints + 1;
  const points = Array.from({ length: steps + 1 }).map((_, index) => ({
    lat: origin.lat + ((destination.lat - origin.lat) * index) / steps,
    lng: origin.lng + ((destination.lng - origin.lng) * index) / steps,
  }));
  const distanceMeters = haversineDistanceMeters(origin, destination);
  const averageSpeedMetersPerSecond = 11.11;

  return {
    points,
    summary: {
      lengthInMeters: Math.round(distanceMeters),
      travelTimeInSeconds: Math.max(
        180,
        Math.round(distanceMeters / averageSpeedMetersPerSecond),
      ),
      trafficDelayInSeconds: Math.round(distanceMeters / 40),
    },
    raw: null,
    source: "simulation",
  };
}

function buildEmergencyPayload(vehicle) {
  return {
    id: vehicle.id,
    type: vehicle.type,
    currentLocation: vehicle.currentLocation,
    destination: vehicle.destination,
    status: vehicle.status,
    speed: vehicle.speed,
    eta: vehicle.eta,
    progress: vehicle.progress,
    routeSummary: vehicle.routeSummary,
    updatedAt: vehicle.updatedAt,
    completedAt: vehicle.completedAt,
  };
}

async function getRouteForEmergency(origin, destination) {
  if (tomTomTrafficService.isConfigured()) {
    const routeResult = await tomTomTrafficService.calculateRoute({ origin, destination });
    if (routeResult.success) {
      return {
        ...routeResult.data,
        source: "tomtom",
      };
    }

    logger.warn("Fallback route generated for emergency", {
      error: routeResult.error,
      origin,
      destination,
    });
  }

  return buildFallbackRoute(origin, destination);
}

export class EmergencyVehicleService {
  constructor({ intervalMs = env.emergencyUpdateIntervalMs } = {}) {
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
  }

  async start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.schedule();
  }

  schedule(delay = this.intervalMs) {
    this.timer = setTimeout(() => {
      void this.tick();
    }, delay);
  }

  async tick() {
    if (!this.running) {
      return;
    }

    try {
      const activeVehicles = await prisma.emergencyVehicle.findMany({
        where: { status: EmergencyStatus.ACTIVE },
        orderBy: { createdAt: "asc" },
      });

      for (const vehicle of activeVehicles) {
        await this.advanceVehicle(vehicle);
      }
    } catch (error) {
      logger.error("Emergency tracker cycle failed", { message: error.message });
    } finally {
      if (this.running) {
        this.schedule();
      }
    }
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async startEmergency({ type, currentLocation, destination, speed = 18 }) {
    const normalizedOrigin = decodeLocation(currentLocation);
    const normalizedDestination = decodeLocation(destination);
    const route = await getRouteForEmergency(normalizedOrigin, normalizedDestination);
    const emergencyVehicle = await prisma.emergencyVehicle.create({
      data: {
        type: EmergencyVehicleType[type],
        currentLocation: normalizedOrigin,
        destination,
        speed,
        eta: Math.round(route.summary.travelTimeInSeconds ?? 0),
        routeGeometry: route.points,
        routeSummary: route.summary,
        lastTrafficSource: route.source,
      },
    });

    const overrides = await applyGreenCorridor({
      emergencyVehicle,
      currentLocation: normalizedOrigin,
      routePoints: route.points,
    });

    pushSystemAction({
      type: "emergency-started",
      message: `${type} dispatched toward ${destination.label ?? "destination"}`,
      createdAt: emergencyVehicle.createdAt,
      emergencyVehicleId: emergencyVehicle.id,
    });

    const payload = {
      ...buildEmergencyPayload(emergencyVehicle),
      overrides,
    };
    trafficEventBus.emit(EMERGENCY_UPDATE_EVENT, payload);

    return payload;
  }

  async advanceVehicle(vehicle) {
    const routePoints = Array.isArray(vehicle.routeGeometry) ? vehicle.routeGeometry : [];
    if (!routePoints.length) {
      return null;
    }

    const routeSummary = vehicle.routeSummary ?? {};
    const totalDistance = Math.max(1, Number(routeSummary.lengthInMeters ?? 1));
    const intervalSeconds = this.intervalMs / 1000;
    const progressDelta = ((vehicle.speed || 14) * intervalSeconds) / totalDistance;
    const progress = Math.min(1, vehicle.progress + progressDelta);
    const currentLocation = interpolateRoutePosition(routePoints, progress);
    const remainingDistance = totalDistance * (1 - progress);
    const eta = Math.max(0, Math.round(remainingDistance / Math.max(vehicle.speed || 14, 1)));
    const completed = progress >= 0.995 || eta === 0;

    const updatedVehicle = await prisma.emergencyVehicle.update({
      where: { id: vehicle.id },
      data: {
        currentLocation,
        progress,
        eta,
        status: completed ? EmergencyStatus.COMPLETED : EmergencyStatus.ACTIVE,
        completedAt: completed ? new Date() : null,
      },
    });

    const overrides = completed
      ? []
      : await applyGreenCorridor({
          emergencyVehicle: updatedVehicle,
          currentLocation,
          routePoints,
        });

    const payload = {
      ...buildEmergencyPayload(updatedVehicle),
      overrides,
    };

    if (completed) {
      pushSystemAction({
        type: "emergency-completed",
        message: `${updatedVehicle.type} completed response route`,
        createdAt: updatedVehicle.completedAt,
        emergencyVehicleId: updatedVehicle.id,
      });
    }

    trafficEventBus.emit(EMERGENCY_UPDATE_EVENT, payload);
    return payload;
  }

  async getActiveVehicles() {
    const vehicles = await prisma.emergencyVehicle.findMany({
      where: { status: EmergencyStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
      include: {
        signalControlLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            intersection: true,
          },
        },
      },
    });

    return vehicles.map((vehicle) => ({
      ...buildEmergencyPayload(vehicle),
      recentOverrides: vehicle.signalControlLogs.map((log) => ({
        id: log.id,
        intersectionName: log.intersection.name,
        action: log.action,
        reason: log.reason,
        createdAt: log.createdAt,
      })),
    }));
  }

  async getHistory(limit = 20) {
    const vehicles = await prisma.emergencyVehicle.findMany({
      where: {
        status: {
          in: [EmergencyStatus.COMPLETED, EmergencyStatus.CANCELLED],
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return vehicles.map(buildEmergencyPayload);
  }
}

export const emergencyVehicleService = new EmergencyVehicleService();
