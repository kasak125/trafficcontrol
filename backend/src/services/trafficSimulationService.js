import { IntersectionStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { defaultIntersections } from "../simulator/defaultIntersections.js";
import { recordTrafficSnapshot } from "./trafficIngestionService.js";
import { clearByPrefix, SUMMARY_CACHE_PREFIX } from "./cacheService.js";

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

function buildMetrics(config, timestamp) {
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

export class TrafficSimulationService {
  constructor({ intervalMs = 4000 } = {}) {
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
    logger.info("Traffic simulation started", { intervalMs: this.intervalMs });
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

      for (const intersection of intersections) {
        const config =
          defaultIntersections.find(
            (item) =>
              item.name === intersection.name ||
              item.legacyName === intersection.name,
          ) ??
          defaultIntersections[0];
        const metrics = buildMetrics(config, timestamp);
        await recordTrafficSnapshot({ intersection, metrics, timestamp });
      }

      await clearByPrefix(SUMMARY_CACHE_PREFIX);
    } catch (error) {
      logger.error("Traffic simulation cycle failed", { message: error.message });
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

    logger.info("Traffic simulation stopped");
  }
}
