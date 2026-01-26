import IORedis from "ioredis";
import { env } from "./env.js";

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined;
};

function createRedisClient(): IORedis {
  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("reconnecting", () => {
    console.warn("[Redis] Reconnecting...");
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
