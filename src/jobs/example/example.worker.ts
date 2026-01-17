import { Worker, type Job } from "bullmq";
import { redis } from "../../queue.js";
import { ExampleJobDataSchema, type ExampleJobData } from "./example.job.js";
import { EXAMPLE_QUEUE_NAME } from "./example.queue.js";
import type { JobResult } from "../types.js";

const processor = async (job: Job<ExampleJobData>): Promise<JobResult<string>> => {
  // Validate job data at runtime
  const parsed = ExampleJobDataSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(`Invalid job data: ${parsed.error.message}`);
  }

  const { message, userId } = parsed.data;

  // Update progress
  await job.updateProgress(10);

  // Simulate processing
  console.log(`[example-worker] Processing job ${job.id}: ${message}`);
  if (userId) {
    console.log(`[example-worker] User ID: ${userId}`);
  }

  await job.updateProgress(50);

  // Simulate work
  await new Promise((resolve) => setTimeout(resolve, 100));

  await job.updateProgress(100);

  return {
    success: true,
    data: `Processed: ${message}`,
  };
};

export const exampleWorker = new Worker<ExampleJobData>(EXAMPLE_QUEUE_NAME, processor, {
  connection: redis,
  concurrency: 5,
});

// Event handlers
exampleWorker.on("completed", (job) => {
  console.log(`[example-worker] Job ${job.id} completed`);
});

exampleWorker.on("failed", (job, error) => {
  console.error(`[example-worker] Job ${job?.id} failed:`, error.message);
});

exampleWorker.on("progress", (job, progress) => {
  console.log(`[example-worker] Job ${job.id} progress: ${JSON.stringify(progress)}`);
});
