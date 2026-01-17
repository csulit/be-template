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
) => void | Promise<void>;
