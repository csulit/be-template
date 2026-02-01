// Queue Names
export const TMS_MARKET_SCOPE_QUEUE_NAME = "tms-market-scope";
export const TMS_MARKET_SCOPE_SCHEDULER_QUEUE_NAME = "tms-market-scope-scheduler";
export const TMS_SCHEDULER_ID = "tms-market-scope-scheduler";

// Worker Configuration
export const MAX_CONCURRENT_JOBS = 3;
export const SCHEDULER_CONCURRENCY = 1;

// Timing Configuration
export const SCHEDULER_INTERVAL_MS = 10_000;
export const PROCESSING_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

// Job Options
export const RECORD_JOB_OPTIONS = {
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
} as const;

export const SCHEDULER_JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 50,
} as const;

// Logging
export const LOG_PREFIX = "[tms-market-scope]";
export const SCHEDULER_LOG_PREFIX = "[tms-market-scope-scheduler]";

// Workflow Retry Configuration
export const WORKFLOW_MAX_RETRIES = 3;
export const WORKFLOW_INITIAL_DELAY_MS = 1000;
export const WORKFLOW_MAX_DELAY_MS = 10000;
export const WORKFLOW_JITTER_FACTOR = 0.3;
