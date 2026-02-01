import { Worker, type Job } from "bullmq";
import { redis } from "../../queue.js";
import { prisma } from "../../db.js";
import {
  runWorkflow,
  type PromptEnhancerInput,
} from "../../modules/talent-market-search/ai-agents/tms.js";
import { talentMarketSearchService } from "../../modules/talent-market-search/talent-market-search.service.js";
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
  WORKFLOW_MAX_RETRIES,
  WORKFLOW_INITIAL_DELAY_MS,
  WORKFLOW_MAX_DELAY_MS,
  WORKFLOW_JITTER_FACTOR,
} from "./tms-market-scope.constant.js";
import type { JobResult } from "../types.js";

/**
 * Database record fields needed for the workflow
 */
interface MarketScopeRecord {
  jobTitle: string;
  budgetMinMax: string;
  intCurrency: string;
  experienceScope: string;
  locationScope: string;
  clientName: string | null;
}

/**
 * Converts a database record into structured input for the prompt enhancer agent.
 * This is the preferred method that enables AI-powered prompt optimization.
 *
 * @param record - The market scope record from the database
 * @returns Structured input for the prompt enhancer
 */
function buildStructuredInput(record: MarketScopeRecord): PromptEnhancerInput {
  return {
    jobTitle: record.jobTitle,
    budgetMinMax: record.budgetMinMax,
    intCurrency: record.intCurrency,
    locationScope: record.locationScope,
    experienceScope: record.experienceScope || undefined,
    clientName: record.clientName,
  };
}

/**
 * Checks if an error is a retryable JSON parsing error from AI output.
 * These errors occur when the AI model returns malformed JSON with invalid Unicode escapes.
 * @internal Exported for testing purposes
 */
export function isRetryableJsonError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("bad unicode escape") ||
    message.includes("invalid output type") ||
    message.includes("unexpected token") ||
    message.includes("json at position")
  );
}

/**
 * Executes the AI workflow with retry logic for transient JSON parsing errors.
 * Uses exponential backoff with jitter to handle AI output inconsistencies.
 */
async function runWorkflowWithRetry(
  structuredInput: PromptEnhancerInput,
  recordId: string
): Promise<Awaited<ReturnType<typeof runWorkflow>>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= WORKFLOW_MAX_RETRIES; attempt++) {
    try {
      return await runWorkflow({ structured_input: structuredInput });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableJsonError(error) || attempt === WORKFLOW_MAX_RETRIES) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(
        WORKFLOW_INITIAL_DELAY_MS * Math.pow(2, attempt - 1),
        WORKFLOW_MAX_DELAY_MS
      );
      const jitter = Math.random() * WORKFLOW_JITTER_FACTOR * baseDelay;
      const delay = Math.round(baseDelay + jitter);

      console.warn(
        `${LOG_PREFIX} Record ${recordId} attempt ${attempt}/${WORKFLOW_MAX_RETRIES} failed with JSON error: ${lastError.message}`
      );
      console.warn(`${LOG_PREFIX} Retrying in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Workflow failed after retries");
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
    const structuredInput = buildStructuredInput(record);
    console.log(`${LOG_PREFIX} Running agent workflow for record ${recordId}`);
    console.log(`${LOG_PREFIX} Job: ${record.jobTitle} | Location: ${record.locationScope}`);

    await job.updateProgress(30);

    // Use structured input with retry logic for transient AI output errors
    const result = await runWorkflowWithRetry(structuredInput, recordId);

    await job.updateProgress(70);

    // Save workflow result to TmsWorkflowResult table for structured querying
    await talentMarketSearchService.saveWorkflowResult(recordId, result);
    console.log(`${LOG_PREFIX} Saved workflow result for record ${recordId}`);

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
    const maxAttempts = job.opts.attempts ?? 1;
    // BullMQ increments attemptsMade AFTER the attempt completes, so on the current
    // attempt, attemptsMade reflects completed attempts (0-indexed). We add 1 to
    // represent the current attempt that just failed.
    const isPermanentFailure = job.attemptsMade + 1 >= maxAttempts;

    if (isPermanentFailure) {
      // Mark as processed with error to prevent scheduler from re-dispatching
      await prisma.tmsMarketScopeSearch.update({
        where: { id: recordId },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          processingAt: null,
          error: errorMessage,
        },
      });
      console.error(
        `${LOG_PREFIX} Record ${recordId} permanently failed after ${job.attemptsMade} attempts:`,
        errorMessage
      );
    } else {
      // Keep processingAt set so scheduler doesn't re-dispatch during BullMQ retry window
      // Only update the error message for debugging
      await prisma.tmsMarketScopeSearch.update({
        where: { id: recordId },
        data: {
          error: errorMessage,
        },
      });
      console.warn(
        `${LOG_PREFIX} Record ${recordId} failed attempt ${job.attemptsMade}/${maxAttempts}:`,
        errorMessage
      );
    }

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
