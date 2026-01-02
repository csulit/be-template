import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter
// For production, use Redis or a distributed rate limiter
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 60_000);

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, limit } = options;

  return createMiddleware(async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `${ip}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    entry.count++;
    store.set(key, entry);

    // Set rate limit headers
    const remaining = Math.max(0, limit - entry.count);
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > limit) {
      c.header("Retry-After", String(Math.ceil((entry.resetTime - now) / 1000)));
      throw new HTTPException(429, { message: "Too many requests" });
    }

    await next();
  });
}
