import type { Socket } from "socket.io";
import { auth } from "../../lib/auth.js";
import type { AuthenticatedSocket } from "../types.js";

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

    // Create headers for better-auth session validation
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

    console.log(`Socket authenticated: socketId=${socket.id}, userId=${session.user.id}`);

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error);
    next(new Error("Authentication failed"));
  }
};
