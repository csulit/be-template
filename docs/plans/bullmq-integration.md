# BullMQ Integration Plan

## Status

**Phases 1, 2, and 4 (partial) are complete.** The core BullMQ infrastructure is in place with an example job for reference.

### Completed
- [x] Redis connection singleton (`src/queue.ts`)
- [x] Job types and utilities (`src/jobs/types.ts`)
- [x] Job registration pattern (`src/jobs/index.ts`)
- [x] Example job implementation (`src/jobs/example/`)
- [x] Server startup integration with graceful shutdown
- [x] Environment configuration (`REDIS_URL`)
- [x] Docker Compose Redis service

### Remaining
- [ ] Phase 3: Email Processing Migration (Optional)
- [ ] Phase 4.3: Redis health check endpoint
- [ ] Phase 5: Monitoring & Admin (Optional)

---

## Overview

This plan outlines the integration of BullMQ for distributed job queue processing in the Hono API backend. BullMQ provides reliable, Redis-backed job queues with features like retries, priorities, delayed jobs, and rate limiting.

## Goals

1. Add Redis and BullMQ infrastructure
2. Create a queue singleton pattern (similar to `db.ts`)
3. Define reusable job queue abstractions
4. Integrate with existing service patterns
5. Support graceful shutdown
6. Maintain type safety with Zod validation

## Dependencies

```bash
pnpm add bullmq ioredis@5.9.1
```

> **Note:** Use `ioredis@5.9.1` to match BullMQ's peer dependency and avoid type conflicts with `exactOptionalPropertyTypes`.

## Architecture

### File Structure

```
src/
├── queue.ts                    # Redis connection singleton
├── jobs/
│   ├── index.ts                # Export all queues/workers, startup/shutdown
│   ├── types.ts                # Shared job types and default options
│   ├── email-listener.job.ts   # Existing IMAP listener (keep for now)
│   ├── example/                # Reference implementation
│   │   ├── index.ts            # Re-exports
│   │   ├── example.job.ts      # Zod schema for job data
│   │   ├── example.queue.ts    # Queue instance
│   │   └── example.worker.ts   # Worker processor
│   └── email-processing/       # (Phase 3 - TODO)
│       ├── index.ts
│       ├── email-processing.job.ts
│       ├── email-processing.queue.ts
│       └── email-processing.worker.ts
```

### Queue Singleton Pattern

```typescript
// src/queue.ts (IMPLEMENTED)
import IORedis from "ioredis";
import { env } from "./env.js";

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined;
};

function createRedisClient(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
```

### Job Structure Pattern

Each job type follows a consistent structure:

**1. Job Data Schema (`*.job.ts`)**
```typescript
import { z } from "zod";

export const EmailProcessingJobDataSchema = z.object({
  emailId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type EmailProcessingJobData = z.infer<typeof EmailProcessingJobDataSchema>;
```

**2. Queue Instance (`*.queue.ts`)**
```typescript
import { Queue } from "bullmq";
import { redis } from "../../queue.js";
import { defaultJobOptions } from "../types.js";
import type { EmailProcessingJobData } from "./email-processing.job.js";

export const EMAIL_PROCESSING_QUEUE_NAME = "email-processing";

export const emailProcessingQueue = new Queue<EmailProcessingJobData>(
  EMAIL_PROCESSING_QUEUE_NAME,
  {
    connection: redis,
    defaultJobOptions,
  }
);
```

**3. Worker Processor (`*.worker.ts`)**
```typescript
import { Worker, type Job } from "bullmq";
import { redis } from "../../queue.js";
import { EmailProcessingJobDataSchema, type EmailProcessingJobData } from "./email-processing.job.js";
import { EMAIL_PROCESSING_QUEUE_NAME } from "./email-processing.queue.js";
import type { JobResult } from "../types.js";

const processor = async (job: Job<EmailProcessingJobData>): Promise<JobResult> => {
  // Validate job data at runtime
  const parsed = EmailProcessingJobDataSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(`Invalid job data: ${parsed.error.message}`);
  }

  const { emailId, userId } = parsed.data;

  await job.updateProgress(10);

  // Process the email
  // const result = await incomingEmailService.processEmail(emailId, userId);

  await job.updateProgress(100);
  return { success: true };
};

export const emailProcessingWorker = new Worker<EmailProcessingJobData>(
  EMAIL_PROCESSING_QUEUE_NAME,
  processor,
  {
    connection: redis,
    concurrency: 5,
  }
);

// Event handlers
emailProcessingWorker.on("completed", (job) => {
  console.log(`[email-processing] Job ${job.id} completed`);
});

emailProcessingWorker.on("failed", (job, error) => {
  console.error(`[email-processing] Job ${job?.id} failed:`, error.message);
});
```

**4. Index Re-exports (`index.ts`)**
```typescript
export { EmailProcessingJobDataSchema, type EmailProcessingJobData } from "./email-processing.job.js";
export { emailProcessingQueue, EMAIL_PROCESSING_QUEUE_NAME } from "./email-processing.queue.js";
export { emailProcessingWorker } from "./email-processing.worker.js";
```

**5. Register in `src/jobs/index.ts`**
```typescript
// Add imports
import { emailProcessingQueue, emailProcessingWorker } from "./email-processing/index.js";

// Add to arrays
const queues: Queue[] = [
  exampleQueue,
  emailProcessingQueue,  // Add here
];

const workers: Worker[] = [
  exampleWorker,
  emailProcessingWorker,  // Add here
];
```

## Environment Configuration

Already implemented in `src/env.ts`:

```typescript
// Redis (for BullMQ job queues)
REDIS_URL: z.string().url().default("redis://localhost:6379"),
```

Already added to `.env.example`:

```
# Redis (for BullMQ job queues)
REDIS_URL=redis://localhost:6379
```

## Implementation Steps

### Phase 1: Infrastructure Setup

1. [x] Install dependencies (`bullmq`, `ioredis@5.9.1`)
2. [x] Add `REDIS_URL` to environment config (`src/env.ts`)
3. [x] Update `.env.example` with Redis configuration
4. [x] Create Redis connection singleton (`src/queue.ts`)
5. [x] Add Redis to docker-compose for local development

### Phase 2: Job Framework

1. [x] Create job types and shared utilities (`src/jobs/types.ts`)
2. [x] Create base job registration pattern (`src/jobs/index.ts`)
3. [x] Create example job implementation for reference

### Phase 3: Email Processing Migration (Optional)

Migrate email processing from synchronous to queue-based for reliability.

1. [ ] Create `src/jobs/email-processing/email-processing.job.ts`
2. [ ] Create `src/jobs/email-processing/email-processing.queue.ts`
3. [ ] Create `src/jobs/email-processing/email-processing.worker.ts`
4. [ ] Create `src/jobs/email-processing/index.ts`
5. [ ] Register queue/worker in `src/jobs/index.ts`
6. [ ] Update IMAP listener to enqueue jobs instead of direct processing
7. [ ] Update `incomingEmailService` to support job-based processing

**Implementation Notes:**
- Keep the IMAP listener for real-time email notifications
- Enqueue processing jobs when new emails arrive
- Worker handles parsing, storage, and any downstream processing
- Benefits: automatic retries, better error isolation, scalability

### Phase 4: Server Integration

1. [x] Start workers during server startup (`src/index.ts`)
2. [x] Add graceful shutdown for workers
3. [ ] Add health check for Redis connection

**Health Check Implementation:**
```typescript
// Add to src/modules/health/health.service.ts or similar
async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
```

### Phase 5: Monitoring & Admin (Optional)

1. [ ] Add BullMQ dashboard route (bull-board or similar)
2. [ ] Add job metrics/logging
3. [ ] Add Sentry integration for job errors

**Bull Board Setup:**
```bash
pnpm add @bull-board/hono @bull-board/api
```

```typescript
// src/modules/admin/bull-board.route.ts
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { exampleQueue } from "../../jobs/example/index.js";

const serverAdapter = new HonoAdapter("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(exampleQueue)],
  serverAdapter,
});

export const bullBoardRoutes = serverAdapter.registerPlugin();
```

## Graceful Shutdown

Already implemented in `src/index.ts`:

```typescript
import { redis } from "./queue.js";
import { closeAllJobs } from "./jobs/index.js";

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop IMAP email listener
  await stopEmailListener();

  // Close BullMQ queues and workers
  await closeAllJobs();

  // Close Redis connection
  await redis.quit();

  server.close(async () => {
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
```

## Service Integration Pattern

Add queue methods to existing services:

```typescript
// src/modules/documents/documents.service.ts
import { documentProcessingQueue } from "../../jobs/document-processing/document-processing.queue.js";

class DocumentsService {
  async create(userId: string, data: CreateDocumentInput): Promise<Document> {
    const document = await prisma.document.create({ data });

    // Enqueue background processing
    await documentProcessingQueue.add(
      "process-document",
      { documentId: document.id, userId },
      { priority: 1 }
    );

    return document;
  }
}
```

## Docker Compose

Already configured in `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: kore-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kore-network

volumes:
  redis_data:
```

## Testing Strategy

### Unit Tests

Mock the queue in unit tests:

```typescript
vi.mock("../../jobs/email-processing/email-processing.queue.js", () => ({
  emailProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
  },
}));
```

### Integration Tests

Use a separate Redis database or testcontainers:

```typescript
import { GenericContainer } from "testcontainers";

beforeAll(async () => {
  const redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start();

  process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
});
```

## Job Options Reference

Common BullMQ job options (defined in `src/jobs/types.ts`):

```typescript
export const defaultJobOptions: JobsOptions = {
  removeOnComplete: 100, // Keep last 100 completed
  removeOnFail: 500,     // Keep last 500 failed
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
};
```

Additional options when adding jobs:

```typescript
await queue.add("job-name", data, {
  // Scheduling
  delay: 5000,            // Delay execution by 5s
  repeat: {               // Recurring job
    pattern: "0 * * * *", // Cron expression (hourly)
  },

  // Priority (lower = higher priority)
  priority: 1,

  // Job identification
  jobId: "unique-id",     // Deduplication
});
```

## Considerations

### Existing Email Listener

The current `email-listener.job.ts` uses ImapFlow with event-based processing. Options:

1. **Keep as-is**: Continue using in-process event listener, only use BullMQ for other jobs
2. **Hybrid** (Recommended): Keep IMAP listener, but enqueue processing to BullMQ for reliability
3. **Full migration**: Use BullMQ repeatable job to poll IMAP periodically

### Scaling

- Workers can run in separate processes/containers
- Use `concurrency` option to control parallelism
- Consider using separate Redis instances for cache vs queues in production

### Observability

- BullMQ supports custom metrics with events
- Integrate with Sentry for error tracking
- Consider adding bull-board for admin UI

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [IORedis Documentation](https://github.com/redis/ioredis)
- [Bull Board](https://github.com/felixmosh/bull-board) (optional admin UI)
