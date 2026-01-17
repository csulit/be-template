import { getIO } from "../socket.js";

/**
 * Emit an event to a specific user's channel
 */
export function emitToUser<T>(namespace: string, userId: string, event: string, data: T): void {
  const io = getIO();
  io.of(namespace).to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all connected clients in a namespace
 */
export function emitToBroadcast<T>(namespace: string, event: string, data: T): void {
  const io = getIO();
  io.of(namespace).emit(event, data);
}

/**
 * Emit an event to a specific room in a namespace
 */
export function emitToRoom<T>(namespace: string, room: string, event: string, data: T): void {
  const io = getIO();
  io.of(namespace).to(room).emit(event, data);
}

/**
 * Get the count of connected sockets in a namespace
 */
export async function getNamespaceSocketCount(namespace: string): Promise<number> {
  const io = getIO();
  const sockets = await io.of(namespace).fetchSockets();
  return sockets.length;
}

/**
 * Get Socket.IO health information
 */
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
