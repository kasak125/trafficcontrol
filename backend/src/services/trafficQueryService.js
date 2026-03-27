import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { buildDateRange } from "../utils/dateRange.js";
import { getJsonCache, setJsonCache, SUMMARY_CACHE_PREFIX } from "./cacheService.js";

function buildSummaryCacheKey(range) {
  return `${SUMMARY_CACHE_PREFIX}${range.from.toISOString()}:${range.to.toISOString()}`;
}

export async function getTrafficSummary(query) {
  const range = buildDateRange(query, { startOfCurrentDay: true });
  const cacheKey = buildSummaryCacheKey(range);
  const cached = await getJsonCache(cacheKey);

  if (cached) {
    return cached;
  }

  const [logAggregate, activeIntersections, optimizationCount, latestLog] = await Promise.all([
    prisma.trafficLog.aggregate({
      where: {
        timestamp: {
          gte: range.from,
          lte: range.to,
        },
      },
      _sum: {
        vehicleCount: true,
      },
      _avg: {
        avgWaitTime: true,
        congestionLevel: true,
      },
    }),
    prisma.intersection.count({
      where: {
        status: {
          not: "OFFLINE",
        },
      },
    }),
    prisma.optimizationLog.count({
      where: {
        timestamp: {
          gte: range.from,
          lte: range.to,
        },
      },
    }),
    prisma.trafficLog.findFirst({
      where: {
        timestamp: {
          gte: range.from,
          lte: range.to,
        },
      },
      orderBy: { timestamp: "desc" },
      include: {
        intersection: true,
      },
    }),
  ]);

  const summary = {
    range,
    totals: {
      vehicles: logAggregate._sum.vehicleCount ?? 0,
      avgWaitTime: Number((logAggregate._avg.avgWaitTime ?? 0).toFixed(2)),
      avgCongestionLevel: Number((logAggregate._avg.congestionLevel ?? 0).toFixed(2)),
      activeIntersections,
      optimizationCount,
    },
    latestSnapshot: latestLog
      ? {
          intersectionId: latestLog.intersectionId,
          intersectionName: latestLog.intersection.name,
          vehicleCount: latestLog.vehicleCount,
          congestionLevel: latestLog.congestionLevel,
          avgWaitTime: latestLog.avgWaitTime,
          timestamp: latestLog.timestamp,
        }
      : null,
  };

  await setJsonCache(cacheKey, summary);
  return summary;
}

export async function getTrafficTrends(query) {
  const range = buildDateRange(query, { fallbackHours: 24 });
  const interval = query.interval || "hour";
  const bucketSql =
    interval === "day"
      ? Prisma.sql`DATE_TRUNC('day', "timestamp")`
      : Prisma.sql`DATE_TRUNC('hour', "timestamp")`;
  const intersectionFilter = query.intersectionId
    ? Prisma.sql`AND tl."intersectionId" = ${query.intersectionId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT
      ${bucketSql} AS bucket,
      SUM(tl."vehicleCount")::int AS "vehicleCount",
      ROUND(AVG(tl."congestionLevel")::numeric, 2) AS "congestionLevel"
    FROM "TrafficLog" tl
    WHERE tl."timestamp" BETWEEN ${range.from} AND ${range.to}
    ${intersectionFilter}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return {
    range,
    interval,
    series: rows.map((row) => ({
      timestamp: row.bucket,
      vehicleCount: Number(row.vehicleCount),
      congestionLevel: Number(row.congestionLevel),
    })),
  };
}

export async function getTrafficWaitTimes(query) {
  const range = buildDateRange(query, { fallbackHours: 24 });
  const intersectionFilter = query.intersectionId
    ? Prisma.sql`AND tl."intersectionId" = ${query.intersectionId}`
    : Prisma.empty;

  const [seriesRows, latestWaitRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('hour', tl."timestamp") AS bucket,
        ROUND(AVG(tl."avgWaitTime")::numeric, 2) AS "avgWaitTime"
      FROM "TrafficLog" tl
      WHERE tl."timestamp" BETWEEN ${range.from} AND ${range.to}
      ${intersectionFilter}
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
    prisma.$queryRaw`
      WITH ranked_waits AS (
        SELECT
          tl."intersectionId",
          tl."avgWaitTime",
          tl."congestionLevel",
          tl."timestamp",
          ROW_NUMBER() OVER (
            PARTITION BY tl."intersectionId"
            ORDER BY tl."timestamp" DESC
          ) AS row_num
        FROM "TrafficLog" tl
        WHERE tl."timestamp" BETWEEN ${range.from} AND ${range.to}
        ${intersectionFilter}
      )
      SELECT
        i.id,
        i.name,
        rw."avgWaitTime",
        rw."congestionLevel",
        rw."timestamp"
      FROM ranked_waits rw
      JOIN "Intersection" i ON i.id = rw."intersectionId"
      WHERE rw.row_num = 1
      ORDER BY rw."avgWaitTime" DESC
      LIMIT ${query.limit}
    `,
  ]);

  return {
    range,
    series: seriesRows.map((row) => ({
      timestamp: row.bucket,
      avgWaitTime: Number(row.avgWaitTime),
    })),
    latestByIntersection: latestWaitRows.map((row) => ({
      intersectionId: row.id,
      name: row.name,
      avgWaitTime: Number(row.avgWaitTime),
      congestionLevel: Number(row.congestionLevel),
      timestamp: row.timestamp,
    })),
  };
}
