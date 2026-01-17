import type { Server as SocketIOServer } from "socket.io";
import { setupNotificationsNamespace } from "./notifications/notifications.namespace.js";

export function registerNamespaces(io: SocketIOServer): void {
  console.log("Registering Socket.IO namespaces");

  setupNotificationsNamespace(io);
  // Add more namespaces here as needed:
  // setupDocumentsNamespace(io);

  console.log("Socket.IO namespaces registered");
}
