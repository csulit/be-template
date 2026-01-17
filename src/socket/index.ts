import type { Server as HTTPServer } from "node:http";
import { createSocketServer, getIO, closeSocketServer } from "../socket.js";
import { registerNamespaces } from "./namespaces/index.js";

export async function initializeSocket(httpServer: HTTPServer): Promise<void> {
  console.log("Initializing Socket.IO server");

  const io = createSocketServer(httpServer);
  registerNamespaces(io);

  io.on("connection", (socket) => {
    console.log(`Client connected to main namespace: socketId=${socket.id}`);
  });

  console.log("Socket.IO server initialized");
}

export { getIO, closeSocketServer };
