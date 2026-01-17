import type { Job, Queue, Worker, JobsOptions } from "bullmq";

/**
 * Default job options for all queues.
 * Individual queues can override these.
 */
export const defaultJobOptions: JobsOptions = {
  removeOnComplete: 100, // Keep last 100 completed
  removeOnFail: 500, // Keep last 500 failed
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
};

/**
 * Job processor function type.
 * Implement this for each job type.
 */
export type JobProcessor<T> = (job: Job<T>) => Promise<unknown>;

/**
 * Registered queue with its worker for management.
 */
export interface RegisteredQueue<T = unknown> {
  queue: Queue<T>;
  worker: Worker<T>;
}

/**
 * Job result interface for standardized responses.
 */
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Job progress update.
 */
export interface JobProgress {
  percent: number;
  message?: string;
}
