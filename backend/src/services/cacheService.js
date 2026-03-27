import { env } from "../config/env.js";
import { getRedisClient } from "../config/redis.js";

export const SUMMARY_CACHE_PREFIX = "traffic:summary:";

export async function getJsonCache(key) {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setJsonCache(key, value, ttlSeconds = env.redisTtlSeconds) {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function clearByPrefix(prefix) {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  let cursor = "0";
  do {
    const [nextCursor, keys] = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await client.del(keys);
    }
  } while (cursor !== "0");
}
