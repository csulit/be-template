import "dotenv/config";

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { redis } from "./queue.js";
import { startEmailListener, stopEmailListener } from "./jobs/email-listener.job.js";
import { startWorkers, closeAllJobs } from "./jobs/index.js";

const app = createApp();

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  async (info) => {
    console.log(`🚀 Server running on http://localhost:${info.port}`);
    console.log(`📚 API docs available at http://localhost:${info.port}/docs`);

    // Start BullMQ workers
    try {
      await startWorkers();
    } catch (error) {
      console.error("Failed to start job workers:", error);
    }

    // Start IMAP email listener
    try {
      await startEmailListener();
    } catch (error) {
      console.error("Failed to start email listener:", error);
    }
  }
);

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop IMAP email listener
  await stopEmailListener();

  // Close BullMQ queues and workers
  await closeAllJobs();

  server.close(async () => {
    // Close Redis connection after server closes
    await redis.quit();
    await prisma.$disconnect();
    console.log("✅ Server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("⚠️ Forcing exit after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
