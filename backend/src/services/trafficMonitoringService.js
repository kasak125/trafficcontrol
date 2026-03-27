import { IntersectionStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { defaultIntersections } from "../simulator/defaultIntersections.js";
import { recordTrafficSnapshot } from "./trafficIngestionService.js";
import { clearByPrefix, SUMMARY_CACHE_PREFIX } from "./cacheService.js";
import { buildBoundingBox, decodeLocation } from "../utils/geo.js";
import { tomTomTrafficService } from "./tomTomTrafficService.js";
import { setTrafficState } from "./trafficStateStore.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTimeMultiplier(hour) {
  if ((hour >= 8 && hour < 10) || (hour >= 18 && hour < 21)) {
    return 1.9;
  }

  if ((hour >= 6 && hour < 8) || (hour >= 10 && hour < 12) || (hour >= 16 && hour < 18)) {
    return 1.35;
  }

  if (hour >= 0 && hour < 5) {
    return 0.45;
  }

  if (hour >= 22) {
    return 0.6;
  }

  return 1;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getDefaultConfigForIntersection(intersection) {
  return (
    defaultIntersections.find(
      (item) => item.name === intersection.name || item.legacyName === intersection.name,
    ) ?? defaultIntersections[0]
  );
}

function simulateMetrics(intersection, timestamp) {
  const config = getDefaultConfigForIntersection(intersection);
  const hour = timestamp.getHours();
  const timeMultiplier = getTimeMultiplier(hour);
  const volatilityMultiplier = 1 + randomBetween(-config.volatility, config.volatility);
  const vehicleCount = Math.round(config.baseLoad * timeMultiplier * volatilityMultiplier);
  const congestionLevel = clamp((vehicleCount / config.capacity) * 100 + randomBetween(-6, 8), 8, 99);
  const avgWaitTime = Math.round(clamp(18 + congestionLevel * 0.9 + randomBetween(-4, 7), 12, 140));

  return {
    vehicleCount,
    congestionLevel: Number(congestionLevel.toFixed(2)),
    avgWaitTime,
  };
}

function normalizeFlowToMetrics(intersection, liveFlow) {
  const config = getDefaultConfigForIntersection(intersection);
  const vehicleCount = Math.round(
    clamp(config.baseLoad + (liveFlow.congestionLevel / 100) * config.capacity * 0.55, 120, config.capacity),
  );
  const avgWaitTime = Math.round(
    clamp(
      18 +
        liveFlow.congestionLevel * 0.85 +
        Math.max(0, liveFlow.currentTravelTime - liveFlow.freeFlowTravelTime) * 0.25,
      10,
      160,
    ),
  );

  return {
    vehicleCount,
    congestionLevel: liveFlow.congestionLevel,
    avgWaitTime,
    meta: {
      currentSpeed: liveFlow.currentSpeed,
      freeFlowSpeed: liveFlow.freeFlowSpeed,
      confidence: liveFlow.confidence,
      roadClosure: liveFlow.roadClosure,
    },
  };
}

function simulateIncidents(flowSnapshots, timestamp) {
  return flowSnapshots
    .filter((snapshot) => snapshot.metrics.congestionLevel >= 75)
    .slice(0, 4)
    .map((snapshot, index) => ({
      id: `sim-incident-${snapshot.intersection.id}-${index}`,
      type: "Feature",
      iconCategory: 7,
      magnitudeOfDelay: Math.round(snapshot.metrics.congestionLevel),
      from: snapshot.intersection.name,
      to: snapshot.intersection.location.address,
      description: "Simulated congestion incident near emergency corridor",
      startTime: timestamp.toISOString(),
      endTime: null,
      geometry: {
        type: "Point",
        coordinates: [snapshot.intersection.location.lng, snapshot.intersection.location.lat],
      },
    }));
}

async function ensureIntersections() {
  for (const config of defaultIntersections) {
    if (config.legacyName) {
      const legacyRecord = await prisma.intersection.findUnique({
        where: { name: config.legacyName },
      });

      if (legacyRecord) {
        await prisma.intersection.update({
          where: { id: legacyRecord.id },
          data: {
            name: config.name,
            location: config.location,
            status: IntersectionStatus.OPERATIONAL,
          },
        });
        continue;
      }
    }

    await prisma.intersection.upsert({
      where: { name: config.name },
      update: {
        location: config.location,
        status: IntersectionStatus.OPERATIONAL,
      },
      create: {
        name: config.name,
        location: config.location,
        status: IntersectionStatus.OPERATIONAL,
      },
    });
  }

  return prisma.intersection.findMany();
}

export class TrafficMonitoringService {
  constructor({ intervalMs = env.liveTrafficPollIntervalMs } = {}) {
    this.intervalMs = intervalMs;
    this.running = false;
    this.timer = null;
    this.cycleInFlight = false;
  }

  async start() {
    if (this.running) {
      return;
    }

    await ensureIntersections();
    this.running = true;
    logger.info("Traffic monitoring started", {
      intervalMs: this.intervalMs,
      source: tomTomTrafficService.isConfigured() ? "tomtom" : "simulation",
    });
    this.schedule(0);
  }

  schedule(delay = this.intervalMs) {
    this.timer = setTimeout(() => {
      void this.runCycle();
    }, delay);
  }

  async runCycle() {
    if (!this.running || this.cycleInFlight) {
      return;
    }

    this.cycleInFlight = true;

    try {
      const timestamp = new Date();
      const intersections = await prisma.intersection.findMany();
      const source = tomTomTrafficService.isConfigured() ? "tomtom" : "simulation";
      const liveFlows =
        source === "tomtom"
          ? await tomTomTrafficService.fetchTrafficFlow(intersections)
          : intersections.map((intersection) => ({
              intersectionId: intersection.id,
              intersectionName: intersection.name,
              location: intersection.location,
              currentSpeed: 0,
              freeFlowSpeed: 0,
              currentTravelTime: 0,
              freeFlowTravelTime: 0,
              roadClosure: false,
              confidence: 0,
              congestionLevel: simulateMetrics(intersection, timestamp).congestionLevel,
              flowData: null,
            }));

      const flowSnapshots = [];

      for (const intersection of intersections) {
        const liveFlow = liveFlows.find((item) => item.intersectionId === intersection.id);
        const normalizedMetrics =
          source === "tomtom"
            ? normalizeFlowToMetrics(intersection, liveFlow)
            : { ...simulateMetrics(intersection, timestamp), meta: { simulated: true } };

        const snapshot = await recordTrafficSnapshot({
          intersection,
          metrics: normalizedMetrics,
          source,
          meta: normalizedMetrics.meta,
          timestamp,
        });

        flowSnapshots.push({
          intersection,
          snapshot,
          metrics: normalizedMetrics,
          liveFlow,
        });
      }

      const bbox = buildBoundingBox(
        intersections.map((intersection) => decodeLocation(intersection.location)),
      );
      const incidents =
        source === "tomtom"
          ? await tomTomTrafficService.fetchIncidents(bbox)
          : simulateIncidents(flowSnapshots, timestamp);

      setTrafficState({
        source,
        lastUpdated: timestamp.toISOString(),
        flow: flowSnapshots.map((item) => ({
          ...item.snapshot,
          currentSpeed: item.liveFlow?.currentSpeed ?? null,
          freeFlowSpeed: item.liveFlow?.freeFlowSpeed ?? null,
          roadClosure: item.liveFlow?.roadClosure ?? false,
        })),
        incidents,
      });

      await clearByPrefix(SUMMARY_CACHE_PREFIX);
    } catch (error) {
      logger.error("Traffic monitoring cycle failed", { message: error.message });
    } finally {
      this.cycleInFlight = false;
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
}
