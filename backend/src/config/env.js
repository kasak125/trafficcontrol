import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  simulationIntervalMs: toNumber(process.env.SIMULATION_INTERVAL_MS, 4000),
  redisTtlSeconds: toNumber(process.env.REDIS_TTL_SECONDS, 15),
  liveTrafficPollIntervalMs: toNumber(process.env.LIVE_TRAFFIC_POLL_INTERVAL_MS, 12000),
  emergencyUpdateIntervalMs: toNumber(process.env.EMERGENCY_UPDATE_INTERVAL_MS, 3000),
  emergencyCongestionThreshold: toNumber(process.env.EMERGENCY_CONGESTION_THRESHOLD, 70),
  tomTomApiKey: process.env.TOMTOM_API_KEY || "",
  tomTomTrafficBaseUrl: process.env.TOMTOM_TRAFFIC_BASE_URL || "https://api.tomtom.com",
  tomTomRoutingBaseUrl: process.env.TOMTOM_ROUTING_BASE_URL || "https://api.tomtom.com",
};
