import type { Server as SocketIOServer, Namespace } from "socket.io";
import { socketAuthMiddleware } from "../../middleware/auth.middleware.js";
import { socketRateLimitMiddleware } from "../../middleware/rate-limit.middleware.js";
import {
  handleSubscribeChannel,
  handleUnsubscribeChannel,
  handleMarkRead,
} from "./notifications.handlers.js";
import type { AuthenticatedSocket } from "../../types.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./notifications.events.js";

export function setupNotificationsNamespace(
  io: SocketIOServer
): Namespace<ClientToServerEvents, ServerToClientEvents> {
  const nsp = io.of("/notifications");

  // Apply middlewares
  nsp.use(socketAuthMiddleware);
  nsp.use(socketRateLimitMiddleware);

  nsp.on("connection", (socket) => {
    const authSocket = socket as unknown as AuthenticatedSocket;
    const userId = authSocket.data.user.id;

    console.log(`Client connected to notifications: socketId=${socket.id}, userId=${userId}`);

    // Auto-join user's personal channel
    socket.join(`user:${userId}`);

    // Register event handlers
    socket.on("subscribe:channel", (data, callback) =>
      handleSubscribeChannel(authSocket, data, callback)
    );

    socket.on("unsubscribe:channel", (data) => handleUnsubscribeChannel(authSocket, data));

    socket.on("mark:read", (data) => handleMarkRead(authSocket, data));

    socket.on("disconnect", (reason) => {
      console.log(
        `Client disconnected from notifications: socketId=${socket.id}, userId=${userId}, reason=${reason}`
      );
    });

    socket.on("error", (error) => {
      console.error(
        `Socket error in notifications namespace: socketId=${socket.id}, userId=${userId}`,
        error
      );
    });
  });

  return nsp as Namespace<ClientToServerEvents, ServerToClientEvents>;
}
