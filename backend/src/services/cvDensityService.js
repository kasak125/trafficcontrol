import { logger } from "../config/logger.js";
import { CV_DENSITY_EVENT, trafficEventBus } from "../events/trafficEventBus.js";
import { getCvDensityState, upsertCvDensityState } from "./trafficStateStore.js";

const CARDINAL_DIRECTIONS = ["North", "South", "East", "West"];
const CV_READING_TTL_MS = 15_000;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeDirection(direction) {
  const normalized = String(direction ?? "")
    .trim()
    .toLowerCase();

  return (
    CARDINAL_DIRECTIONS.find((candidate) => candidate.toLowerCase() === normalized) ?? "North"
  );
}

function getCoordinates(intersection) {
  return {
    lat: Number(intersection.location?.lat ?? 0),
    lng: Number(intersection.location?.lng ?? 0),
  };
}

function buildDirectionAssignments(intersections) {
  const withCoordinates = intersections.map((intersection) => ({
    intersection,
    ...getCoordinates(intersection),
  }));
  const assignments = new Map();
  const availableIds = new Set(withCoordinates.map((entry) => entry.intersection.id));

  const assign = (direction, sortedEntries) => {
    const next =
      sortedEntries.find((entry) => availableIds.has(entry.intersection.id)) ?? sortedEntries[0];

    if (!next) {
      return;
    }

    assignments.set(next.intersection.id, direction);
    availableIds.delete(next.intersection.id);
  };

  assign(
    "North",
    [...withCoordinates].sort((left, right) => right.lat - left.lat),
  );
  assign(
    "South",
    [...withCoordinates].sort((left, right) => left.lat - right.lat),
  );
  assign(
    "East",
    [...withCoordinates].sort((left, right) => right.lng - left.lng),
  );
  assign(
    "West",
    [...withCoordinates].sort((left, right) => left.lng - right.lng),
  );

  return assignments;
}

function buildDerivedMetrics(metrics, vehiclesWaiting) {
  const queuePressure = clamp(vehiclesWaiting / 28, 0, 1.2);
  const estimatedVehicleCount = clamp(Math.round(vehiclesWaiting * 42), 36, 1800);
  const congestionFromCv = clamp(Math.round(22 + queuePressure * 58 + vehiclesWaiting * 0.45), 12, 100);
  const avgWaitFromCv = clamp(
    Math.round(16 + vehiclesWaiting * 1.8 + congestionFromCv * 0.32),
    12,
    180,
  );

  return {
    vehicleCount: estimatedVehicleCount,
    congestionLevel: Math.max(metrics.congestionLevel ?? 0, congestionFromCv),
    avgWaitTime: Math.max(metrics.avgWaitTime ?? 0, avgWaitFromCv),
  };
}

function getFreshReading(direction, timestamp) {
  const state = getCvDensityState();
  const reading = state[direction];

  if (!reading) {
    return null;
  }

  const freshnessMs = Math.max(0, timestamp.getTime() - new Date(reading.receivedAt).getTime());
  if (freshnessMs > CV_READING_TTL_MS) {
    return null;
  }

  return {
    ...reading,
    freshnessMs,
  };
}

export function recordCvDensityReading({
  direction,
  vehiclesWaiting,
  detectedCounts = null,
  capturedAt = new Date().toISOString(),
}) {
  const normalizedDirection = normalizeDirection(direction);
  const reading = {
    direction: normalizedDirection,
    vehiclesWaiting,
    detectedCounts,
    capturedAt,
    receivedAt: new Date().toISOString(),
  };

  upsertCvDensityState(reading);
  trafficEventBus.emit(CV_DENSITY_EVENT, reading);
  logger.info("CV density reading received", {
    direction: normalizedDirection,
    vehiclesWaiting,
  });

  return reading;
}

export function getCvDensityReadings() {
  const readings = Object.values(getCvDensityState()).sort(
    (left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
  );

  return {
    lastUpdated: readings[0]?.receivedAt ?? null,
    readings,
  };
}

export function applyCvDensityOverride({
  intersection,
  intersections,
  metrics,
  timestamp = new Date(),
}) {
  const assignments = buildDirectionAssignments(intersections);
  const direction = assignments.get(intersection.id);

  if (!direction) {
    return metrics;
  }

  const reading = getFreshReading(direction, timestamp);
  if (!reading) {
    return metrics;
  }

  const derivedMetrics = buildDerivedMetrics(metrics, reading.vehiclesWaiting);
  logger.info(`TomTom/simulation metrics overridden by CV feed for ${intersection.name}`, {
    direction,
    vehiclesWaiting: reading.vehiclesWaiting,
    estimatedVehicleCount: derivedMetrics.vehicleCount,
  });

  return {
    ...metrics,
    ...derivedMetrics,
    meta: {
      ...(metrics.meta ?? {}),
      cvOverride: {
        direction,
        vehiclesWaiting: reading.vehiclesWaiting,
        estimatedVehicleCount: derivedMetrics.vehicleCount,
        receivedAt: reading.receivedAt,
        capturedAt: reading.capturedAt,
        freshnessMs: reading.freshnessMs,
        detectedCounts: reading.detectedCounts ?? null,
      },
      sensorSource: `${metrics.meta?.sensorSource ?? "traffic monitoring"} + cv camera`,
    },
  };
}
