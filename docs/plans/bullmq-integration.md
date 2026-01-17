# BullMQ Integration Plan

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
pnpm add bullmq ioredis
pnpm add -D @types/ioredis
```

## Architecture

### File Structure

```
src/
├── queue.ts                    # Redis connection singleton
├── jobs/
│   ├── index.ts                # Export all queues/workers
│   ├── types.ts                # Shared job types
│   ├── email-listener.job.ts   # Existing (keep for now)
│   ├── email-processing/
│   │   ├── email-processing.queue.ts      # Queue instance
│   │   ├── email-processing.worker.ts     # Worker processor
│   │   └── email-processing.job.ts        # Job data schemas
│   └── example-job/
│       ├── example.queue.ts
│       ├── example.worker.ts
│       └── example.job.ts
```

### Queue Singleton Pattern

```typescript
// src/queue.ts
import IORedis from "ioredis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
  });

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
```

### Job Structure Pattern

Each job type follows a consistent structure:

**1. Job Data Schema (`*.job.ts`)**
```typescript
import { z } from "zod";

export const EmailProcessingJobSchema = z.object({
  emailId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type EmailProcessingJobData = z.infer<typeof EmailProcessingJobSchema>;
```

**2. Queue Instance (`*.queue.ts`)**
```typescript
import { Queue } from "bullmq";
import { redis } from "@/queue";
import type { EmailProcessingJobData } from "./email-processing.job";

export const emailProcessingQueue = new Queue<EmailProcessingJobData>(
  "email-processing",
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  }
);
```

**3. Worker Processor (`*.worker.ts`)**
```typescript
import { Worker, Job } from "bullmq";
import { redis } from "@/queue";
import { EmailProcessingJobSchema, type EmailProcessingJobData } from "./email-processing.job";
import { incomingEmailService } from "@/modules/incoming-email";
import { logger } from "@/lib/logger";

const processor = async (job: Job<EmailProcessingJobData>) => {
  // Validate job data
  const parsed = EmailProcessingJobSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(`Invalid job data: ${parsed.error.message}`);
  }

  const { emailId, userId } = parsed.data;

  // Update progress
  await job.updateProgress(10);

  // Process the email
  const result = await incomingEmailService.processEmail(emailId, userId);

  await job.updateProgress(100);
  return result;
};

export const emailProcessingWorker = new Worker<EmailProcessingJobData>(
  "email-processing",
  processor,
  {
    connection: redis,
    concurrency: 5,
  }
);

// Event handlers
emailProcessingWorker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed`, { jobId: job.id, queue: "email-processing" });
});

emailProcessingWorker.on("failed", (job, error) => {
  logger.error(`Job ${job?.id} failed`, { jobId: job?.id, error: error.message, queue: "email-processing" });
});
```

## Environment Configuration

Add to `src/env.ts`:

```typescript
// Add to schema
REDIS_URL: z.string().url().default("redis://localhost:6379"),

// Add to type export
```

Add to `.env.example`:

```
# Redis (for BullMQ job queues)
REDIS_URL=redis://localhost:6379
```

## Implementation Steps

### Phase 1: Infrastructure Setup

1. [ ] Install dependencies (`bullmq`, `ioredis`)
2. [ ] Add `REDIS_URL` to environment config (`src/env.ts`)
3. [ ] Update `.env.example` with Redis configuration
4. [ ] Create Redis connection singleton (`src/queue.ts`)
5. [ ] Add Redis to docker-compose for local development

### Phase 2: Job Framework

1. [ ] Create job types and shared utilities (`src/jobs/types.ts`)
2. [ ] Create base job registration pattern (`src/jobs/index.ts`)
3. [ ] Create example job implementation for reference

### Phase 3: Email Processing Migration (Optional)

1. [ ] Create email processing job schema
2. [ ] Create email processing queue
3. [ ] Create email processing worker
4. [ ] Update IMAP provider to enqueue jobs instead of direct processing
5. [ ] Update `incomingEmailService` to support job-based processing

### Phase 4: Server Integration

1. [ ] Start workers during server startup (`src/index.ts`)
2. [ ] Add graceful shutdown for workers
3. [ ] Add health check for Redis connection

### Phase 5: Monitoring & Admin (Optional)

1. [ ] Add BullMQ dashboard route (bull-board or similar)
2. [ ] Add job metrics/logging
3. [ ] Add Sentry integration for job errors

## Graceful Shutdown

Extend `src/index.ts`:

```typescript
import { closeQueues, closeWorkers } from "@/jobs";
import { redis } from "@/queue";

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new jobs
  await closeQueues();

  // Wait for workers to finish current jobs
  await closeWorkers();

  // Close Redis connection
  await redis.quit();

  // Close HTTP server
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

## Service Integration Pattern

Add queue methods to existing services:

```typescript
// src/modules/documents/documents.service.ts
import { documentProcessingQueue } from "@/jobs/document-processing/document-processing.queue";

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

## Docker Compose Addition

Add Redis service:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

## Testing Strategy

### Unit Tests

Mock the queue in unit tests:

```typescript
vi.mock("@/jobs/email-processing/email-processing.queue", () => ({
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

Common BullMQ job options:

```typescript
{
  // Retry configuration
  attempts: 3,
  backoff: {
    type: "exponential", // or "fixed"
    delay: 1000,
  },

  // Job lifecycle
  removeOnComplete: 100,  // Keep last 100 completed
  removeOnFail: 500,      // Keep last 500 failed

  // Scheduling
  delay: 5000,            // Delay execution by 5s
  repeat: {               // Recurring job
    pattern: "0 * * * *", // Cron expression (hourly)
  },

  // Priority (lower = higher priority)
  priority: 1,

  // Job identification
  jobId: "unique-id",     // Deduplication
}
```

## Considerations

### Existing Email Listener

The current `email-listener.job.ts` uses ImapFlow with event-based processing. Options:

1. **Keep as-is**: Continue using in-process event listener, only use BullMQ for other jobs
2. **Hybrid**: Keep IMAP listener, but enqueue processing to BullMQ for reliability
3. **Full migration**: Use BullMQ repeatable job to poll IMAP periodically

Recommended: **Hybrid approach** - Keep IMAP listener for real-time notifications, but enqueue email processing to BullMQ for reliable retry handling.

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
