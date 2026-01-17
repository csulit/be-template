import { Queue } from "bullmq";
import { redis } from "../../queue.js";
import { defaultJobOptions } from "../types.js";
import type { ExampleJobData } from "./example.job.js";

export const EXAMPLE_QUEUE_NAME = "example";

export const exampleQueue = new Queue<ExampleJobData>(EXAMPLE_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});
