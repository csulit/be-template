import { Queue } from "bullmq";
import { redis } from "../../queue.js";
import { defaultJobOptions } from "../types.js";
import type { TmsMarketScopeJobData, TmsMarketScopeSchedulerData } from "./tms-market-scope.job.js";
import {
  TMS_MARKET_SCOPE_QUEUE_NAME,
  TMS_MARKET_SCOPE_SCHEDULER_QUEUE_NAME,
  TMS_SCHEDULER_ID,
  SCHEDULER_INTERVAL_MS,
  RECORD_JOB_OPTIONS,
  SCHEDULER_JOB_OPTIONS,
  LOG_PREFIX,
} from "./tms-market-scope.constant.js";

export const tmsMarketScopeQueue = new Queue<TmsMarketScopeJobData>(TMS_MARKET_SCOPE_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    ...RECORD_JOB_OPTIONS,
  },
});

export const tmsMarketScopeSchedulerQueue = new Queue<TmsMarketScopeSchedulerData>(
  TMS_MARKET_SCOPE_SCHEDULER_QUEUE_NAME,
  {
    connection: redis,
    defaultJobOptions: SCHEDULER_JOB_OPTIONS,
  }
);

export async function initTmsMarketScopeScheduler(): Promise<void> {
  await tmsMarketScopeSchedulerQueue.upsertJobScheduler(
    TMS_SCHEDULER_ID,
    { every: SCHEDULER_INTERVAL_MS },
    { data: {} }
  );

  const intervalSeconds = SCHEDULER_INTERVAL_MS / 1000;
  console.log(`${LOG_PREFIX} Scheduler initialized (runs every ${intervalSeconds}s)`);
}

export async function stopTmsMarketScopeScheduler(): Promise<void> {
  await tmsMarketScopeSchedulerQueue.removeJobScheduler(TMS_SCHEDULER_ID);
  console.log(`${LOG_PREFIX} Scheduler stopped`);
}
