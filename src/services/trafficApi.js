const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const rangeConfig = {
  today: {
    interval: "hour",
    titleSuffix: "Today",
    limit: 6,
    buildFrom(now) {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return from;
    },
  },
  "7d": {
    interval: "day",
    titleSuffix: "Last 7 Days",
    limit: 8,
    buildFrom(now) {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return from;
    },
  },
  "30d": {
    interval: "day",
    titleSuffix: "Last 30 Days",
    limit: 8,
    buildFrom(now) {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return from;
    },
  },
};

function formatBucketLabel(timestamp, interval) {
  const date = new Date(timestamp);

  if (interval === "hour") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function toKpiData(summary) {
  const totals = summary.totals;

  return [
    {
      title: "Total Vehicles",
      value: totals.vehicles.toLocaleString(),
      detail: `Across selected period`,
      tone: "positive",
    },
    {
      title: "Avg Signal Wait Time",
      value: `${Math.round(totals.avgWaitTime)}s`,
      detail: `${totals.optimizationCount} optimizations applied`,
      tone: "positive",
    },
    {
      title: "Avg Congestion Level",
      value: `${totals.avgCongestionLevel.toFixed(1)}%`,
      detail: summary.latestSnapshot
        ? `Latest: ${summary.latestSnapshot.intersectionName}`
        : "Awaiting live snapshot",
      tone: "neutral",
    },
    {
      title: "Active Intersections",
      value: totals.activeIntersections.toLocaleString(),
      detail: "Currently reporting data",
      tone: "neutral",
    },
  ];
}

function toTrafficTrendSeries(trends, interval) {
  return trends.series.map((item) => ({
    time: formatBucketLabel(item.timestamp, interval),
    vehicles: item.vehicleCount,
    congestion: item.congestionLevel,
  }));
}

function toWaitSeries(waitTimes, interval) {
  return waitTimes.series.map((item) => ({
    time: formatBucketLabel(item.timestamp, interval),
    wait: item.avgWaitTime,
  }));
}

async function request(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || `Request failed for ${path}`);
  }

  return payload.data;
}

export async function fetchDashboardData(rangeKey) {
  const config = rangeConfig[rangeKey] || rangeConfig["7d"];
  const now = new Date();
  const from = config.buildFrom(now).toISOString();
  const to = now.toISOString();

  const [summary, trends, waitTimes] = await Promise.all([
    request("/traffic/summary", { from, to }),
    request("/traffic/trends", { from, to, interval: config.interval }),
    request("/traffic/wait-times", { from, to, limit: config.limit }),
  ]);

  return {
    summary,
    titleSuffix: config.titleSuffix,
    kpis: toKpiData(summary),
    trafficTrend: toTrafficTrendSeries(trends, config.interval),
    waitTimes: toWaitSeries(waitTimes, config.interval),
    waitLeaderboard: waitTimes.latestByIntersection,
    exportPayload: {
      range: rangeKey,
      exportedAt: now.toISOString(),
      summary,
      trends,
      waitTimes,
    },
  };
}
