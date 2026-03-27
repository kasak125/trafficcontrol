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
import { generateTraffic } from "./fallbackTrafficService.js";
import { getParkingAvailability } from "./parkingAvailabilityService.js";
import { PARKING_UPDATE_EVENT, trafficEventBus } from "../events/trafficEventBus.js";

function getDefaultConfigForIntersection(intersection) {
  return (
    defaultIntersections.find(
      (item) => item.name === intersection.name || item.legacyName === intersection.name,
    ) ?? defaultIntersections[0]
  );
}

function normalizeFlowToMetrics(intersection, liveFlow) {
  const config = getDefaultConfigForIntersection(intersection);
  const vehicleCount = Math.round(
    Math.min(
      config.capacity,
      Math.max(120, config.baseLoad + (liveFlow.congestionLevel / 100) * config.capacity * 0.55),
    ),
  );
  const avgWaitTime = Math.round(
    Math.min(
      160,
      Math.max(
        10,
      18 +
        liveFlow.congestionLevel * 0.85 +
          Math.max(0, liveFlow.currentTravelTime - liveFlow.freeFlowTravelTime) * 0.25,
      ),
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
      const shouldUseTomTom = tomTomTrafficService.isConfigured();
      const flowSnapshots = [];
      const flowSources = new Set();

      for (const intersection of intersections) {
        let liveFlow = null;
        let source = "simulation";
        let normalizedMetrics = generateTraffic(intersection, timestamp);

        if (shouldUseTomTom) {
          const flowResult = await tomTomTrafficService.fetchFlowForIntersection(intersection);
          if (flowResult.success) {
            liveFlow = flowResult.data;
            normalizedMetrics = normalizeFlowToMetrics(intersection, liveFlow);
            source = "tomtom";
          } else {
            logger.warn(`TomTom failed for intersection ${intersection.name}, using fallback`, {
              error: flowResult.error,
            });
          }
        }

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
          source,
        });
        flowSources.add(source);
      }

      const bbox = buildBoundingBox(
        intersections.map((intersection) => decodeLocation(intersection.location)),
      );
      let incidents = simulateIncidents(flowSnapshots, timestamp);
      let stateSource =
        flowSources.size > 1 ? "mixed" : flowSources.has("tomtom") ? "tomtom" : "simulation";

      if (shouldUseTomTom) {
        const incidentResult = await tomTomTrafficService.fetchIncidents(bbox);
        if (incidentResult.success) {
          incidents = incidentResult.data;
        } else {
          logger.warn("TomTom incidents request failed, using fallback incidents", {
            error: incidentResult.error,
          });
          if (stateSource === "tomtom") {
            stateSource = "mixed";
          }
        }
      }

      setTrafficState({
        source: stateSource,
        lastUpdated: timestamp.toISOString(),
        flow: flowSnapshots.map((item) => ({
          ...item.snapshot,
          source: item.source,
          currentSpeed: item.liveFlow?.currentSpeed ?? null,
          freeFlowSpeed: item.liveFlow?.freeFlowSpeed ?? null,
          roadClosure: item.liveFlow?.roadClosure ?? false,
        })),
        incidents,
      });
      const parkingState = await getParkingAvailability();
      trafficEventBus.emit(PARKING_UPDATE_EVENT, parkingState);

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
