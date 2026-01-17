# Socket.IO Integration Plan

## Overview

This plan outlines the integration of Socket.IO for real-time bidirectional communication in the Hono API backend. Socket.IO provides WebSocket-based communication with automatic fallback to HTTP long-polling, room/namespace support, and built-in reconnection handling.

## Goals

1. Add Socket.IO server infrastructure alongside existing Hono HTTP server
2. Create a socket singleton pattern (similar to `db.ts` and planned `queue.ts`)
3. Integrate with better-auth session-based authentication
4. Define namespace-based organization following module patterns
5. Support graceful shutdown
6. Maintain type safety with Zod validation for events
7. Plan for horizontal scaling with Redis adapter

## Dependencies

```bash
pnpm add socket.io
pnpm add -D @types/node  # Already present
```

**Optional (for scaling):**
```bash
pnpm add @socket.io/redis-adapter ioredis
```

## Architecture

### File Structure

```
src/
├── socket.ts                       # Socket.IO server singleton
├── socket/
│   ├── index.ts                    # Export all namespaces and setup
│   ├── types.ts                    # Shared socket types and interfaces
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Socket authentication middleware
│   │   └── rate-limit.middleware.ts # Socket rate limiting
│   ├── namespaces/
│   │   ├── index.ts                # Namespace registration
│   │   ├── notifications/
│   │   │   ├── notifications.namespace.ts   # Namespace setup
│   │   │   ├── notifications.handlers.ts    # Event handlers
│   │   │   └── notifications.events.ts      # Event schemas (Zod)
│   │   └── documents/
│   │       ├── documents.namespace.ts
│   │       ├── documents.handlers.ts
│   │       └── documents.events.ts
```

### Socket.IO Server Singleton

```typescript
// src/socket.ts
import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import { env } from "@/env";

let io: SocketIOServer | null = null;

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS?.split(",") ?? "*",
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call createSocketServer first.");
  }
  return io;
}

export async function closeSocketServer(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => resolve());
    });
    io = null;
  }
}
```

### Socket Types

```typescript
// src/socket/types.ts
import type { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
    sessionId: string;
  };
}

export interface SocketEventHandler<TData = unknown, TResponse = void> {
  (socket: AuthenticatedSocket, data: TData): Promise<TResponse> | TResponse;
}

export interface SocketNamespaceConfig {
  path: string;
  handlers: Record<string, SocketEventHandler>;
  middlewares?: SocketMiddleware[];
}

export type SocketMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => void;
```

### Authentication Middleware

```typescript
// src/socket/middleware/auth.middleware.ts
import type { Socket } from "socket.io";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { AuthenticatedSocket } from "../types";

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // Extract session from cookie or auth header
    const cookies = socket.handshake.headers.cookie;
    const authHeader = socket.handshake.auth?.token as string | undefined;

    if (!cookies && !authHeader) {
      return next(new Error("Authentication required"));
    }

    // Create a mock request for better-auth session validation
    const headers = new Headers();
    if (cookies) {
      headers.set("cookie", cookies);
    }
    if (authHeader) {
      headers.set("authorization", `Bearer ${authHeader}`);
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session?.user) {
      return next(new Error("Invalid session"));
    }

    // Attach user data to socket
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.data = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as { role?: string }).role ?? "user",
      },
      sessionId: session.session.id,
    };

    logger.info("Socket authenticated", {
      socketId: socket.id,
      userId: session.user.id,
    });

    next();
  } catch (error) {
    logger.error("Socket authentication failed", { error });
    next(new Error("Authentication failed"));
  }
};
```

### Event Schema Pattern

```typescript
// src/socket/namespaces/notifications/notifications.events.ts
import { z } from "zod";

// Client -> Server events
export const SubscribeChannelSchema = z.object({
  channel: z.string().min(1).max(100),
});
export type SubscribeChannelData = z.infer<typeof SubscribeChannelSchema>;

export const UnsubscribeChannelSchema = z.object({
  channel: z.string().min(1).max(100),
});
export type UnsubscribeChannelData = z.infer<typeof UnsubscribeChannelSchema>;

// Server -> Client events
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["info", "success", "warning", "error"]),
  title: z.string(),
  message: z.string(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
});
export type NotificationData = z.infer<typeof NotificationSchema>;

// Event map for type safety
export interface ClientToServerEvents {
  "subscribe:channel": (data: SubscribeChannelData, callback?: (response: { success: boolean }) => void) => void;
  "unsubscribe:channel": (data: UnsubscribeChannelData) => void;
  "mark:read": (data: { notificationId: string }) => void;
}

export interface ServerToClientEvents {
  "notification:new": (data: NotificationData) => void;
  "notification:updated": (data: NotificationData) => void;
  error: (data: { message: string; code?: string }) => void;
}
```

### Namespace Handler Pattern

```typescript
// src/socket/namespaces/notifications/notifications.handlers.ts
import type { AuthenticatedSocket } from "../../types";
import {
  SubscribeChannelSchema,
  UnsubscribeChannelSchema,
  type SubscribeChannelData,
  type UnsubscribeChannelData,
} from "./notifications.events";
import { logger } from "@/lib/logger";

export const handleSubscribeChannel = async (
  socket: AuthenticatedSocket,
  data: unknown,
  callback?: (response: { success: boolean }) => void
): Promise<void> => {
  const parsed = SubscribeChannelSchema.safeParse(data);

  if (!parsed.success) {
    socket.emit("error", {
      message: "Invalid channel data",
      code: "VALIDATION_ERROR",
    });
    callback?.({ success: false });
    return;
  }

  const { channel } = parsed.data;
  const userId = socket.data.user.id;

  // Validate user can access this channel (e.g., user-specific channels)
  const userChannel = `user:${userId}`;
  const allowedChannels = [userChannel, "broadcast"];

  if (!allowedChannels.includes(channel) && !channel.startsWith(`user:${userId}:`)) {
    socket.emit("error", {
      message: "Access denied to channel",
      code: "FORBIDDEN",
    });
    callback?.({ success: false });
    return;
  }

  await socket.join(channel);
  logger.info("Socket joined channel", {
    socketId: socket.id,
    userId,
    channel,
  });

  callback?.({ success: true });
};

export const handleUnsubscribeChannel = async (
  socket: AuthenticatedSocket,
  data: unknown
): Promise<void> => {
  const parsed = UnsubscribeChannelSchema.safeParse(data);

  if (!parsed.success) {
    socket.emit("error", {
      message: "Invalid channel data",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const { channel } = parsed.data;
  await socket.leave(channel);

  logger.info("Socket left channel", {
    socketId: socket.id,
    userId: socket.data.user.id,
    channel,
  });
};

export const handleMarkRead = async (
  socket: AuthenticatedSocket,
  data: { notificationId: string }
): Promise<void> => {
  // Call notification service to mark as read
  // await notificationService.markRead(data.notificationId, socket.data.user.id);

  logger.info("Notification marked as read", {
    notificationId: data.notificationId,
    userId: socket.data.user.id,
  });
};
```

### Namespace Setup Pattern

```typescript
// src/socket/namespaces/notifications/notifications.namespace.ts
import type { Server as SocketIOServer, Namespace } from "socket.io";
import { socketAuthMiddleware } from "../../middleware/auth.middleware";
import {
  handleSubscribeChannel,
  handleUnsubscribeChannel,
  handleMarkRead,
} from "./notifications.handlers";
import type { AuthenticatedSocket } from "../../types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./notifications.events";
import { logger } from "@/lib/logger";

export function setupNotificationsNamespace(io: SocketIOServer): Namespace {
  const nsp = io.of("/notifications");

  // Apply authentication middleware
  nsp.use(socketAuthMiddleware);

  nsp.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.data.user.id;

    logger.info("Client connected to notifications", {
      socketId: socket.id,
      userId,
    });

    // Auto-join user's personal channel
    socket.join(`user:${userId}`);

    // Register event handlers
    socket.on("subscribe:channel", (data, callback) =>
      handleSubscribeChannel(authSocket, data, callback)
    );

    socket.on("unsubscribe:channel", (data) =>
      handleUnsubscribeChannel(authSocket, data)
    );

    socket.on("mark:read", (data) =>
      handleMarkRead(authSocket, data)
    );

    socket.on("disconnect", (reason) => {
      logger.info("Client disconnected from notifications", {
        socketId: socket.id,
        userId,
        reason,
      });
    });

    socket.on("error", (error) => {
      logger.error("Socket error in notifications namespace", {
        socketId: socket.id,
        userId,
        error,
      });
    });
  });

  return nsp;
}
```

### Namespace Registration

```typescript
// src/socket/namespaces/index.ts
import type { Server as SocketIOServer } from "socket.io";
import { setupNotificationsNamespace } from "./notifications/notifications.namespace";
// import { setupDocumentsNamespace } from "./documents/documents.namespace";
import { logger } from "@/lib/logger";

export function registerNamespaces(io: SocketIOServer): void {
  logger.info("Registering Socket.IO namespaces");

  setupNotificationsNamespace(io);
  // setupDocumentsNamespace(io);

  logger.info("Socket.IO namespaces registered");
}
```

### Socket Index

```typescript
// src/socket/index.ts
import type { Server as HTTPServer } from "node:http";
import { createSocketServer, getIO, closeSocketServer } from "@/socket";
import { registerNamespaces } from "./namespaces";
import { logger } from "@/lib/logger";

export async function initializeSocket(httpServer: HTTPServer): Promise<void> {
  logger.info("Initializing Socket.IO server");

  const io = createSocketServer(httpServer);
  registerNamespaces(io);

  io.on("connection", (socket) => {
    logger.debug("Client connected to main namespace", { socketId: socket.id });
  });

  logger.info("Socket.IO server initialized");
}

export { getIO, closeSocketServer };
```

## Environment Configuration

Add to `src/env.ts`:

```typescript
// Add to schema
SOCKET_IO_ENABLED: z.coerce.boolean().default(true),
SOCKET_IO_PATH: z.string().default("/socket.io"),

// Optional: For Redis adapter (scaling)
REDIS_URL: z.string().url().optional(),
```

Add to `.env.example`:

```bash
# Socket.IO Configuration
SOCKET_IO_ENABLED=true
SOCKET_IO_PATH=/socket.io

# Redis (optional, for Socket.IO scaling and BullMQ)
REDIS_URL=redis://localhost:6379
```

## Server Integration

Modify `src/index.ts`:

```typescript
import { serve } from "@hono/node-server";
import { app } from "@/app";
import { env } from "@/env";
import { initializeSocket, closeSocketServer } from "@/socket";
import { stopEmailListener } from "@/jobs/email-listener.job";
import { pool } from "@/db";
import { logger } from "@/lib/logger";

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  async (info) => {
    logger.info(`Server running on http://localhost:${info.port}`);

    // Initialize Socket.IO if enabled
    if (env.SOCKET_IO_ENABLED) {
      // Access the underlying HTTP server
      const httpServer = server as unknown as import("node:http").Server;
      await initializeSocket(httpServer);
    }

    // Start background jobs
    // await startEmailListener();
  }
);

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Close Socket.IO connections
  if (env.SOCKET_IO_ENABLED) {
    await closeSocketServer();
    logger.info("Socket.IO server closed");
  }

  // Stop background jobs
  await stopEmailListener();

  // Close database connection
  await pool.end();
  logger.info("Database connection closed");

  // Close HTTP server
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

## Implementation Steps

### Phase 1: Core Infrastructure

1. [ ] Install Socket.IO dependency
2. [ ] Add environment variables to `src/env.ts`
3. [ ] Update `.env.example` with Socket.IO configuration
4. [ ] Create Socket.IO server singleton (`src/socket.ts`)
5. [ ] Create socket types (`src/socket/types.ts`)

### Phase 2: Authentication & Middleware

1. [ ] Create socket authentication middleware using better-auth
2. [ ] Create socket rate limiting middleware (optional)
3. [ ] Test authentication with existing session cookies

### Phase 3: Namespace Framework

1. [ ] Create namespace registration pattern (`src/socket/namespaces/index.ts`)
2. [ ] Create notifications namespace as reference implementation
3. [ ] Create event schema pattern with Zod validation

### Phase 4: Server Integration

1. [ ] Integrate Socket.IO with HTTP server in `src/index.ts`
2. [ ] Add graceful shutdown for Socket.IO
3. [ ] Add Socket.IO connection to health check endpoint

### Phase 5: Service Integration

1. [ ] Create utility functions to emit events from services
2. [ ] Integrate with existing services (notifications, documents)
3. [ ] Add event emission to relevant service methods

### Phase 6: Redis Adapter (Optional - For Scaling)

1. [ ] Install Redis adapter dependency
2. [ ] Configure adapter when `REDIS_URL` is available
3. [ ] Test multi-instance communication

### Phase 7: Testing

1. [ ] Create socket test helpers
2. [ ] Write integration tests for authentication
3. [ ] Write integration tests for namespace handlers
4. [ ] Test reconnection and error scenarios

## Service Integration Pattern

Emit events from existing services:

```typescript
// src/modules/documents/documents.service.ts
import { getIO } from "@/socket";

class DocumentsService {
  async update(
    id: string,
    userId: string,
    data: UpdateDocumentInput
  ): Promise<Document> {
    const document = await prisma.document.update({
      where: { id, userId },
      data,
    });

    // Emit real-time update to user
    const io = getIO();
    io.of("/documents").to(`user:${userId}`).emit("document:updated", {
      id: document.id,
      title: document.title,
      updatedAt: document.updatedAt.toISOString(),
    });

    return document;
  }
}
```

Utility helper for common patterns:

```typescript
// src/socket/utils.ts
import { getIO } from "@/socket";

export function emitToUser<T>(
  namespace: string,
  userId: string,
  event: string,
  data: T
): void {
  const io = getIO();
  io.of(namespace).to(`user:${userId}`).emit(event, data);
}

export function emitToBroadcast<T>(
  namespace: string,
  event: string,
  data: T
): void {
  const io = getIO();
  io.of(namespace).emit(event, data);
}

export function emitToRoom<T>(
  namespace: string,
  room: string,
  event: string,
  data: T
): void {
  const io = getIO();
  io.of(namespace).to(room).emit(event, data);
}
```

## Redis Adapter for Scaling

When running multiple server instances:

```typescript
// src/socket.ts (extended)
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import type { Server as HTTPServer } from "node:http";
import { env } from "@/env";

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS?.split(",") ?? "*",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Configure Redis adapter for horizontal scaling
  if (env.REDIS_URL) {
    const pubClient = new IORedis(env.REDIS_URL);
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.IO Redis adapter configured");
  }

  return io;
}
```

## Client Connection Example

```typescript
// Client-side example (for documentation)
import { io } from "socket.io-client";

const socket = io("http://localhost:3000/notifications", {
  // Auth token from better-auth (if not using cookies)
  auth: {
    token: "session-token-here",
  },
  // Or rely on cookies (default with credentials: true)
  withCredentials: true,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  // Subscribe to channels
  socket.emit("subscribe:channel", { channel: "user:123" }, (response) => {
    console.log("Subscribed:", response.success);
  });
});

socket.on("notification:new", (notification) => {
  console.log("New notification:", notification);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

## Testing Strategy

### Unit Tests

Mock Socket.IO in unit tests:

```typescript
// tests/unit/socket/handlers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSubscribeChannel } from "@/socket/namespaces/notifications/notifications.handlers";
import type { AuthenticatedSocket } from "@/socket/types";

describe("handleSubscribeChannel", () => {
  let mockSocket: AuthenticatedSocket;

  beforeEach(() => {
    mockSocket = {
      id: "test-socket-id",
      data: {
        user: { id: "user-123", email: "test@example.com", name: "Test", role: "user" },
        sessionId: "session-123",
      },
      join: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
    } as unknown as AuthenticatedSocket;
  });

  it("should join valid user channel", async () => {
    const callback = vi.fn();
    await handleSubscribeChannel(mockSocket, { channel: "user:user-123" }, callback);

    expect(mockSocket.join).toHaveBeenCalledWith("user:user-123");
    expect(callback).toHaveBeenCalledWith({ success: true });
  });

  it("should reject invalid channel access", async () => {
    const callback = vi.fn();
    await handleSubscribeChannel(mockSocket, { channel: "user:other-user" }, callback);

    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith("error", expect.objectContaining({
      code: "FORBIDDEN",
    }));
    expect(callback).toHaveBeenCalledWith({ success: false });
  });
});
```

### Integration Tests

```typescript
// tests/integration/socket/notifications.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io, Socket } from "socket.io-client";
import { createTestServer, createTestSession } from "../../helpers/test-server";

describe("Notifications Namespace", () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;
  let socket: Socket;
  let sessionToken: string;

  beforeAll(async () => {
    server = await createTestServer();
    sessionToken = await createTestSession({ userId: "test-user" });
  });

  afterAll(async () => {
    socket?.disconnect();
    await server.close();
  });

  it("should authenticate and connect", async () => {
    socket = io(`http://localhost:${server.port}/notifications`, {
      auth: { token: sessionToken },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve, reject) => {
      socket.on("connect", resolve);
      socket.on("connect_error", reject);
    });

    expect(socket.connected).toBe(true);
  });

  it("should receive notifications in user channel", async () => {
    const notificationPromise = new Promise((resolve) => {
      socket.on("notification:new", resolve);
    });

    // Trigger notification from server
    server.emitNotification("test-user", {
      id: "notif-1",
      type: "info",
      title: "Test",
      message: "Hello",
      createdAt: new Date().toISOString(),
      read: false,
    });

    const notification = await notificationPromise;
    expect(notification).toMatchObject({ id: "notif-1", type: "info" });
  });
});
```

## Considerations

### CORS Configuration

Socket.IO CORS must match Hono CORS settings. Both should accept credentials for cookie-based authentication.

### Rate Limiting

Consider implementing per-socket rate limiting for events to prevent abuse:

```typescript
// src/socket/middleware/rate-limit.middleware.ts
import type { Socket } from "socket.io";

const eventCounts = new Map<string, { count: number; resetAt: number }>();

export const socketRateLimitMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
): void => {
  const limit = 100; // events per window
  const window = 60000; // 1 minute

  socket.use((event, next) => {
    const now = Date.now();
    const key = socket.id;
    const record = eventCounts.get(key) ?? { count: 0, resetAt: now + window };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + window;
    }

    if (record.count >= limit) {
      return next(new Error("Rate limit exceeded"));
    }

    record.count++;
    eventCounts.set(key, record);
    next();
  });

  next();
};
```

### Connection State Recovery

Socket.IO 4.6+ supports connection state recovery for seamless reconnects:

```typescript
const io = new SocketIOServer(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: false, // Re-run auth on recovery
  },
});
```

### Sticky Sessions (Load Balancing)

When using multiple server instances behind a load balancer, enable sticky sessions or use the Redis adapter. With Redis adapter, sticky sessions are not required.

### Health Check Integration

Add Socket.IO status to health check:

```typescript
// src/modules/health/health.service.ts
import { getIO } from "@/socket";

export function getSocketIOHealth(): { connected: number; namespaces: string[] } {
  try {
    const io = getIO();
    const sockets = io.sockets.sockets.size;
    const namespaces = [...io._nsps.keys()];
    return { connected: sockets, namespaces };
  } catch {
    return { connected: 0, namespaces: [] };
  }
}
```

## References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO with Hono](https://github.com/honojs/node-server) - Uses same HTTP server
- [@socket.io/redis-adapter](https://socket.io/docs/v4/redis-adapter/)
- [better-auth Session API](https://www.better-auth.com/docs/api-reference)
