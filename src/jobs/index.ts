import type { Queue, Worker } from "bullmq";

// Import all queues and workers
import { exampleQueue, exampleWorker } from "./example/index.js";

// Re-export types
export * from "./types.js";

// Re-export example job
export * from "./example/index.js";

/**
 * All registered queues.
 * Add new queues here for centralized management.
 */
const queues: Queue[] = [
  exampleQueue,
  // Add more queues here
];

/**
 * All registered workers.
 * Add new workers here for centralized management.
 */
const workers: Worker[] = [
  exampleWorker,
  // Add more workers here
];

/**
 * Start all workers.
 * Call this during server startup.
 */
export async function startWorkers(): Promise<void> {
  console.log(`[jobs] Starting ${workers.length} worker(s)...`);

  // Workers start automatically when created, but we can add initialization logic here
  for (const worker of workers) {
    console.log(`[jobs] Worker "${worker.name}" is running`);
  }
}

/**
 * Close all queues gracefully.
 * Call this during shutdown to stop accepting new jobs.
 */
export async function closeQueues(): Promise<void> {
  console.log(`[jobs] Closing ${queues.length} queue(s)...`);

  await Promise.all(
    queues.map(async (queue) => {
      await queue.close();
      console.log(`[jobs] Queue "${queue.name}" closed`);
    })
  );
}

/**
 * Close all workers gracefully.
 * Call this during shutdown to wait for current jobs to complete.
 */
export async function closeWorkers(): Promise<void> {
  console.log(`[jobs] Closing ${workers.length} worker(s)...`);

  await Promise.all(
    workers.map(async (worker) => {
      await worker.close();
      console.log(`[jobs] Worker "${worker.name}" closed`);
    })
  );
}

/**
 * Close all queues and workers.
 * Convenience method for graceful shutdown.
 */
export async function closeAllJobs(): Promise<void> {
  await closeQueues();
  await closeWorkers();
}
