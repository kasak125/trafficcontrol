import http from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { registerTrafficSocketServer } from "./sockets/registerTrafficSocketServer.js";
import { TrafficMonitoringService } from "./services/trafficMonitoringService.js";
import { emergencyVehicleService } from "./services/emergencyVehicleService.js";

const httpServer = http.createServer(app);
const { io, dispose } = registerTrafficSocketServer(httpServer);
const trafficMonitoringService = new TrafficMonitoringService({
  intervalMs: env.liveTrafficPollIntervalMs,
});

async function startServer() {
  await prisma.$connect();
  await connectRedis();
  await trafficMonitoringService.start();
  await emergencyVehicleService.start();

  httpServer.listen(env.port, () => {
    logger.info("Smart Traffic backend is running", {
      port: env.port,
      environment: env.nodeEnv,
    });
  });
}

async function shutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown.`);
  trafficMonitoringService.stop();
  emergencyVehicleService.stop();
  dispose();
  io.close();

  httpServer.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
    logger.info("Shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startServer().catch(async (error) => {
  logger.error("Failed to start backend", { message: error.message, stack: error.stack });
  await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
  process.exit(1);
});
