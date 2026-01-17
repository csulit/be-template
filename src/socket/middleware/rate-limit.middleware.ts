import type { Socket } from "socket.io";

const eventCounts = new Map<string, { count: number; resetAt: number }>();

export const socketRateLimitMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const limit = 100; // events per window
  const window = 60000; // 1 minute

  socket.use(([_event], packetNext) => {
    const now = Date.now();
    const key = socket.id;
    const record = eventCounts.get(key) ?? { count: 0, resetAt: now + window };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + window;
    }

    if (record.count >= limit) {
      const error = new Error("Rate limit exceeded");
      return packetNext(error);
    }

    record.count++;
    eventCounts.set(key, record);
    packetNext();
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    eventCounts.delete(socket.id);
  });

  next();
};
