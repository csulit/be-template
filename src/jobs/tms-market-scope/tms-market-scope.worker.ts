import { Worker, type Job } from "bullmq";
import { redis } from "../../queue.js";
import { prisma } from "../../db.js";
import { runWorkflow } from "../../modules/talent-market-search/ai-agents/tms.js";
import {
  TmsMarketScopeJobDataSchema,
  type TmsMarketScopeJobData,
  type TmsMarketScopeSchedulerData,
} from "./tms-market-scope.job.js";
import { tmsMarketScopeQueue } from "./tms-market-scope.queue.js";
import {
  TMS_MARKET_SCOPE_QUEUE_NAME,
  TMS_MARKET_SCOPE_SCHEDULER_QUEUE_NAME,
  MAX_CONCURRENT_JOBS,
  SCHEDULER_CONCURRENCY,
  PROCESSING_LOCK_TIMEOUT_MS,
  LOG_PREFIX,
  SCHEDULER_LOG_PREFIX,
} from "./tms-market-scope.constant.js";
import type { JobResult } from "../types.js";

interface MarketScopeRecord {
  jobTitle: string;
  budgetMinMax: string;
  intCurrency: string;
  experienceScope: string;
  locationScope: string;
  clientName: string | null;
}

function buildAgentInput(record: MarketScopeRecord): string {
  const parts = [
    `Job Title: ${record.jobTitle}`,
    `Budget Range: ${record.budgetMinMax} ${record.intCurrency}`,
    `Experience Level: ${record.experienceScope}`,
    `Location(s): ${record.locationScope}`,
  ];

  if (record.clientName) {
    parts.push(`Client: ${record.clientName}`);
  }

  return parts.join("\n");
}

async function processRecord(job: Job<TmsMarketScopeJobData>): Promise<JobResult> {
  const parsed = TmsMarketScopeJobDataSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(`Invalid job data: ${parsed.error.message}`);
  }

  const { recordId } = parsed.data;

  console.log(`${LOG_PREFIX} Processing record ${recordId}`);
  await job.updateProgress(10);

  const record = await prisma.tmsMarketScopeSearch.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      jobTitle: true,
      budgetMinMax: true,
      intCurrency: true,
      experienceScope: true,
      locationScope: true,
      clientName: true,
      isProcessed: true,
      processingAt: true,
    },
  });

  if (!record) {
    console.log(`${LOG_PREFIX} Record ${recordId} not found, skipping`);
    return { success: true, data: "Record not found" };
  }

  if (record.isProcessed) {
    console.log(`${LOG_PREFIX} Record ${recordId} already processed, skipping`);
    return { success: true, data: "Already processed" };
  }

  await job.updateProgress(20);

  try {
    const inputText = buildAgentInput(record);
    console.log(`${LOG_PREFIX} Running agent workflow for record ${recordId}`);

    await job.updateProgress(30);

    const result = await runWorkflow({ input_as_text: inputText });

    await job.updateProgress(90);

    await prisma.tmsMarketScopeSearch.update({
      where: { id: recordId },
      data: {
        isProcessed: true,
        processedAt: new Date(),
        processingAt: null,
        result: result as object,
        error: null,
      },
    });

    await job.updateProgress(100);

    console.log(`${LOG_PREFIX} Record ${recordId} processed successfully`);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.tmsMarketScopeSearch.update({
      where: { id: recordId },
      data: {
        processingAt: null,
        error: errorMessage,
      },
    });

    console.error(`${LOG_PREFIX} Record ${recordId} failed:`, errorMessage);
    throw error;
  }
}

async function schedulerProcessor(_job: Job<TmsMarketScopeSchedulerData>): Promise<JobResult> {
  const staleLockThreshold = new Date(Date.now() - PROCESSING_LOCK_TIMEOUT_MS);

  // Find unprocessed records that are either:
  // 1. Not locked (processingAt is null)
  // 2. Have a stale lock (processingAt is older than threshold)
  const unprocessedRecords = await prisma.tmsMarketScopeSearch.findMany({
    where: {
      isProcessed: false,
      OR: [{ processingAt: null }, { processingAt: { lt: staleLockThreshold } }],
    },
    select: { id: true },
    take: MAX_CONCURRENT_JOBS,
    orderBy: { createdAt: "asc" }, // Process oldest first
  });

  if (unprocessedRecords.length === 0) {
    return { success: true, data: "No records to process" };
  }

  console.log(`${SCHEDULER_LOG_PREFIX} Found ${unprocessedRecords.length} unprocessed record(s)`);

  const dispatched: string[] = [];

  for (const record of unprocessedRecords) {
    const updated = await prisma.tmsMarketScopeSearch.updateMany({
      where: {
        id: record.id,
        isProcessed: false,
        OR: [{ processingAt: null }, { processingAt: { lt: staleLockThreshold } }],
      },
      data: {
        processingAt: new Date(),
      },
    });

    if (updated.count > 0) {
      await tmsMarketScopeQueue.add(`process-${record.id}`, { recordId: record.id });
      dispatched.push(record.id);
      console.log(`${SCHEDULER_LOG_PREFIX} Dispatched job for record ${record.id}`);
    }
  }

  return {
    success: true,
    data: `Dispatched ${dispatched.length} job(s)`,
  };
}

export const tmsMarketScopeWorker = new Worker<TmsMarketScopeJobData>(
  TMS_MARKET_SCOPE_QUEUE_NAME,
  processRecord,
  {
    connection: redis,
    concurrency: MAX_CONCURRENT_JOBS,
  }
);

export const tmsMarketScopeSchedulerWorker = new Worker<TmsMarketScopeSchedulerData>(
  TMS_MARKET_SCOPE_SCHEDULER_QUEUE_NAME,
  schedulerProcessor,
  {
    connection: redis,
    concurrency: SCHEDULER_CONCURRENCY,
  }
);

tmsMarketScopeWorker.on("completed", (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed`);
});

tmsMarketScopeWorker.on("failed", (job, error) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, error.message);
});

tmsMarketScopeWorker.on("progress", (job, progress) => {
  console.log(`${LOG_PREFIX} Job ${job.id} progress: ${JSON.stringify(progress)}`);
});

tmsMarketScopeSchedulerWorker.on("failed", (_job, error) => {
  console.error(`${SCHEDULER_LOG_PREFIX} Scheduler job failed:`, error.message);
});
