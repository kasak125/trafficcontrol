import Redis from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redisClient = null;

export async function connectRedis() {
  if (!env.redisUrl) {
    logger.warn("Redis URL not provided. Cache layer will run in passthrough mode.");
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null,
    reconnectOnError: () => false,
  });

  redisClient.on("error", (error) => {
    logger.warn("Redis connection error", { message: error.message });
  });

  try {
    await redisClient.connect();
    logger.info("Redis connected");
    return redisClient;
  } catch (error) {
    redisClient.removeAllListeners("error");
    redisClient.disconnect(false);
    logger.warn("Redis unavailable. Continuing without cache.", {
      message: error.message,
    });
    redisClient = null;
    return null;
  }
}

export function getRedisClient() {
  return redisClient;
}

export async function disconnectRedis() {
  if (!redisClient) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}
