import IORedis from "ioredis";
import { env } from "./env.js";

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined;
};

function createRedisClient(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
