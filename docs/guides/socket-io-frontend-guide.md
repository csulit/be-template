# Socket.IO Frontend Integration Guide

A comprehensive guide for integrating Socket.IO real-time features in TanStack Start applications.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [TypeScript Types](#typescript-types)
- [Socket Client Setup](#socket-client-setup)
- [React Hooks](#react-hooks)
- [Notifications Integration](#notifications-integration)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The backend provides Socket.IO-based real-time communication with:

- **Authentication**: Session-based auth via cookies (integrates with better-auth)
- **Namespaces**: Feature-specific channels (e.g., `/notifications`)
- **Rooms**: User-specific channels for targeted messaging
- **Rate Limiting**: 100 events per minute per connection

### Available Namespaces

| Namespace | Purpose |
|-----------|---------|
| `/notifications` | Real-time notifications for users |

### Server Configuration

| Setting | Value |
|---------|-------|
| Transports | WebSocket, HTTP long-polling (fallback) |
| Ping timeout | 60 seconds |
| Ping interval | 25 seconds |
| Auto-reconnect | Enabled |

## Installation

```bash
pnpm add socket.io-client
```

## TypeScript Types

Create shared types that mirror the backend event schemas.

### `src/lib/socket/types.ts`

```typescript
// Notification types
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SocketError {
  message: string;
  code?: string;
}

// Channel subscription
export interface SubscribeChannelData {
  channel: string;
}

export interface UnsubscribeChannelData {
  channel: string;
}

export interface MarkReadData {
  notificationId: string;
}

// Event maps for type-safe socket usage
export interface NotificationServerToClientEvents {
  "notification:new": (data: Notification) => void;
  "notification:updated": (data: Notification) => void;
  error: (data: SocketError) => void;
}

export interface NotificationClientToServerEvents {
  "subscribe:channel": (
    data: SubscribeChannelData,
    callback?: (response: { success: boolean }) => void
  ) => void;
  "unsubscribe:channel": (data: UnsubscribeChannelData) => void;
  "mark:read": (data: MarkReadData) => void;
}

// Connection states
export type SocketConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
```

## Socket Client Setup

### `src/lib/socket/client.ts`

```typescript
import { io, Socket } from "socket.io-client";
import type {
  NotificationServerToClientEvents,
  NotificationClientToServerEvents,
} from "./types";

// Type-safe socket for notifications namespace
export type NotificationSocket = Socket<
  NotificationServerToClientEvents,
  NotificationClientToServerEvents
>;

// Configuration
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Socket instances (singleton pattern)
let notificationSocket: NotificationSocket | null = null;

/**
 * Create or get the notifications socket connection.
 * Uses cookie-based authentication automatically.
 */
export function getNotificationSocket(): NotificationSocket {
  if (!notificationSocket) {
    notificationSocket = io(`${SOCKET_URL}/notifications`, {
      // Use cookies for authentication (session-based)
      withCredentials: true,
      // Prefer WebSocket, fallback to polling
      transports: ["websocket", "polling"],
      // Auto-reconnect settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Timeout settings
      timeout: 20000,
    });
  }

  return notificationSocket;
}

/**
 * Disconnect and cleanup the notification socket.
 */
export function disconnectNotificationSocket(): void {
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
}

/**
 * Check if the notification socket is connected.
 */
export function isNotificationSocketConnected(): boolean {
  return notificationSocket?.connected ?? false;
}
```

### Token-Based Authentication (Alternative)

If not using cookies, pass a token in the auth object:

```typescript
export function getNotificationSocket(token: string): NotificationSocket {
  if (!notificationSocket) {
    notificationSocket = io(`${SOCKET_URL}/notifications`, {
      auth: {
        token, // Bearer token from your auth system
      },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }

  return notificationSocket;
}
```

## React Hooks

### `src/hooks/use-socket.ts`

```typescript
import { useEffect, useState, useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { SocketConnectionState } from "@/lib/socket/types";

interface UseSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnect when socket disconnects */
  autoReconnect?: boolean;
}

interface UseSocketReturn<TSocket extends Socket> {
  socket: TSocket | null;
  isConnected: boolean;
  connectionState: SocketConnectionState;
  connect: () => void;
  disconnect: () => void;
  error: Error | null;
}

/**
 * Generic hook for managing socket connections.
 */
export function useSocket<TSocket extends Socket>(
  getSocket: () => TSocket,
  options: UseSocketOptions = {}
): UseSocketReturn<TSocket> {
  const { autoConnect = true, autoReconnect = true } = options;

  const [socket, setSocket] = useState<TSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] =
    useState<SocketConnectionState>("disconnected");
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<TSocket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionState("connecting");
    setError(null);

    const newSocket = getSocket();
    socketRef.current = newSocket;
    setSocket(newSocket);

    if (!newSocket.connected) {
      newSocket.connect();
    }
  }, [getSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionState("disconnected");
    }
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    connect();

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState("connected");
      setError(null);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setConnectionState("disconnected");

      // Auto-reconnect for certain disconnect reasons
      if (autoReconnect && reason === "io server disconnect") {
        socket.connect();
      }
    };

    const handleConnectError = (err: Error) => {
      setConnectionState("error");
      setError(err);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // Check initial connection state
    if (socket.connected) {
      setIsConnected(true);
      setConnectionState("connected");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, autoReconnect]);

  return {
    socket,
    isConnected,
    connectionState,
    connect,
    disconnect,
    error,
  };
}
```

### `src/hooks/use-notification-socket.ts`

```typescript
import { useEffect, useCallback } from "react";
import { useSocket } from "./use-socket";
import {
  getNotificationSocket,
  disconnectNotificationSocket,
  type NotificationSocket,
} from "@/lib/socket/client";
import type { Notification, SocketError } from "@/lib/socket/types";

interface UseNotificationSocketOptions {
  /** Called when a new notification is received */
  onNotification?: (notification: Notification) => void;
  /** Called when a notification is updated */
  onNotificationUpdated?: (notification: Notification) => void;
  /** Called on socket errors */
  onError?: (error: SocketError) => void;
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

interface UseNotificationSocketReturn {
  isConnected: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "error";
  subscribeToChannel: (
    channel: string,
    callback?: (response: { success: boolean }) => void
  ) => void;
  unsubscribeFromChannel: (channel: string) => void;
  markAsRead: (notificationId: string) => void;
  connect: () => void;
  disconnect: () => void;
  error: Error | null;
}

/**
 * Hook for managing notification socket connections and events.
 */
export function useNotificationSocket(
  options: UseNotificationSocketOptions = {}
): UseNotificationSocketReturn {
  const {
    onNotification,
    onNotificationUpdated,
    onError,
    autoConnect = true,
  } = options;

  const { socket, isConnected, connectionState, connect, disconnect, error } =
    useSocket<NotificationSocket>(getNotificationSocket, { autoConnect });

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      onNotification?.(notification);
    };

    const handleUpdatedNotification = (notification: Notification) => {
      onNotificationUpdated?.(notification);
    };

    const handleError = (err: SocketError) => {
      onError?.(err);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:updated", handleUpdatedNotification);
    socket.on("error", handleError);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:updated", handleUpdatedNotification);
      socket.off("error", handleError);
    };
  }, [socket, onNotification, onNotificationUpdated, onError]);

  // Subscribe to a channel
  const subscribeToChannel = useCallback(
    (channel: string, callback?: (response: { success: boolean }) => void) => {
      if (!socket?.connected) {
        console.warn("Socket not connected. Cannot subscribe to channel.");
        callback?.({ success: false });
        return;
      }

      socket.emit("subscribe:channel", { channel }, callback);
    },
    [socket]
  );

  // Unsubscribe from a channel
  const unsubscribeFromChannel = useCallback(
    (channel: string) => {
      if (!socket?.connected) {
        console.warn("Socket not connected. Cannot unsubscribe from channel.");
        return;
      }

      socket.emit("unsubscribe:channel", { channel });
    },
    [socket]
  );

  // Mark notification as read
  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!socket?.connected) {
        console.warn("Socket not connected. Cannot mark notification as read.");
        return;
      }

      socket.emit("mark:read", { notificationId });
    },
    [socket]
  );

  return {
    isConnected,
    connectionState,
    subscribeToChannel,
    unsubscribeFromChannel,
    markAsRead,
    connect,
    disconnect,
    error,
  };
}
```

## Notifications Integration

### Notifications Context Provider

Create a context to manage notifications state globally.

### `src/contexts/notifications-context.tsx`

```typescript
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useNotificationSocket } from "@/hooks/use-notification-socket";
import type { Notification, SocketError } from "@/lib/socket/types";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "error";
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  error: Error | SocketError | null;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

interface NotificationsProviderProps {
  children: ReactNode;
  /** Maximum notifications to keep in state */
  maxNotifications?: number;
}

export function NotificationsProvider({
  children,
  maxNotifications = 50,
}: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socketError, setSocketError] = useState<SocketError | null>(null);

  // Handle new notifications
  const handleNotification = useCallback(
    (notification: Notification) => {
      setNotifications((prev) => {
        // Add to beginning, limit total count
        const updated = [notification, ...prev].slice(0, maxNotifications);
        return updated;
      });
    },
    [maxNotifications]
  );

  // Handle notification updates (e.g., marked as read on another device)
  const handleNotificationUpdated = useCallback((notification: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? notification : n))
    );
  }, []);

  // Handle socket errors
  const handleError = useCallback((error: SocketError) => {
    setSocketError(error);
    console.error("Socket error:", error);
  }, []);

  const {
    isConnected,
    connectionState,
    markAsRead: socketMarkAsRead,
    error: connectionError,
  } = useNotificationSocket({
    onNotification: handleNotification,
    onNotificationUpdated: handleNotificationUpdated,
    onError: handleError,
    autoConnect: true,
  });

  // Mark single notification as read
  const markAsRead = useCallback(
    (notificationId: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      // Send to server
      socketMarkAsRead(notificationId);
    },
    [socketMarkAsRead]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Send each to server (or implement batch endpoint)
    notifications.filter((n) => !n.read).forEach((n) => socketMarkAsRead(n.id));
  }, [notifications, socketMarkAsRead]);

  // Clear all notifications from state
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    isConnected,
    connectionState,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    error: connectionError || socketError,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }

  return context;
}
```

### Using the Provider

Wrap your app with the provider in your root layout.

### `src/routes/__root.tsx`

```typescript
import { NotificationsProvider } from "@/contexts/notifications-context";

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider maxNotifications={100}>
      {children}
    </NotificationsProvider>
  );
}
```

### Notification Bell Component

### `src/components/notification-bell.tsx`

```typescript
import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/contexts/notifications-context";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-6 w-6" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        <span
          className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Type indicator */}
                    <NotificationIcon type={notification.type} />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  const colors = {
    info: "text-blue-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
  };

  return (
    <span className={`h-2 w-2 rounded-full ${colors[type]} flex-shrink-0 mt-2`} />
  );
}
```

## Authentication

The backend authenticates socket connections using the same session cookies as HTTP requests.

### Cookie-Based Auth (Default)

If you're using cookie-based sessions (recommended), no additional setup is needed. Ensure:

1. `withCredentials: true` is set on the socket client
2. CORS is configured on the backend to accept credentials from your frontend origin

```typescript
// Backend CORS should include your frontend origin
CORS_ORIGINS=http://localhost:3001,https://your-app.com
```

### Handling Auth Errors

```typescript
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export function useSocketAuthHandler() {
  const navigate = useNavigate();

  const { error, connectionState } = useNotificationSocket({
    onError: (err) => {
      if (err.code === "UNAUTHORIZED" || err.message === "Authentication required") {
        // Redirect to login
        navigate({ to: "/login" });
      }
    },
  });

  useEffect(() => {
    if (error?.message?.includes("Invalid session")) {
      navigate({ to: "/login" });
    }
  }, [error, navigate]);
}
```

### Reconnecting After Login

```typescript
import { disconnectNotificationSocket, getNotificationSocket } from "@/lib/socket/client";

export function useAuth() {
  const login = async (credentials: LoginCredentials) => {
    // Perform login
    await authApi.login(credentials);

    // Reconnect socket with new session
    disconnectNotificationSocket();
    getNotificationSocket(); // Will connect with new cookies
  };

  const logout = async () => {
    // Disconnect socket first
    disconnectNotificationSocket();

    // Perform logout
    await authApi.logout();
  };

  return { login, logout };
}
```

## Error Handling

### Connection Error States

```typescript
export function ConnectionStatus() {
  const { connectionState, error } = useNotifications();

  if (connectionState === "connecting") {
    return <span className="text-yellow-600">Connecting...</span>;
  }

  if (connectionState === "error") {
    return (
      <span className="text-red-600">
        Connection error: {error?.message || "Unknown error"}
      </span>
    );
  }

  if (connectionState === "disconnected") {
    return <span className="text-gray-500">Disconnected</span>;
  }

  return <span className="text-green-600">Connected</span>;
}
```

### Retry Logic

The socket client includes built-in retry logic. For custom handling:

```typescript
export function useSocketWithRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  const { socket, connectionState, connect } = useSocket(getNotificationSocket, {
    autoConnect: true,
  });

  useEffect(() => {
    if (!socket) return;

    const handleReconnectAttempt = (attempt: number) => {
      setRetryCount(attempt);
      console.log(`Reconnection attempt ${attempt}/${maxRetries}`);
    };

    const handleReconnectFailed = () => {
      console.error("Failed to reconnect after maximum attempts");
      // Show user-friendly error
    };

    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.io.on("reconnect_failed", handleReconnectFailed);

    return () => {
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.io.off("reconnect_failed", handleReconnectFailed);
    };
  }, [socket]);

  return { retryCount, connectionState, connect };
}
```

## Best Practices

### 1. Cleanup on Unmount

Always disconnect sockets when components unmount:

```typescript
useEffect(() => {
  const socket = getNotificationSocket();

  return () => {
    socket.off("notification:new");
    // Note: Don't disconnect if other components still need it
  };
}, []);
```

### 2. Debounce Frequent Events

For events that fire rapidly:

```typescript
import { useDebouncedCallback } from "use-debounce";

export function useTypingIndicator() {
  const { socket } = useSocket(getDocumentsSocket);

  const emitTyping = useDebouncedCallback(
    () => {
      socket?.emit("typing:start", { documentId: "123" });
    },
    300,
    { leading: true, trailing: false }
  );

  return { emitTyping };
}
```

### 3. Optimistic Updates

Update UI immediately, then sync with server:

```typescript
const markAsRead = useCallback((notificationId: string) => {
  // 1. Optimistic update
  setNotifications((prev) =>
    prev.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    )
  );

  // 2. Send to server
  socket?.emit("mark:read", { notificationId });

  // 3. Handle potential failure
  // (Could implement rollback if server rejects)
}, [socket]);
```

### 4. Connection State in UI

Show users when real-time features are unavailable:

```typescript
export function RealTimeIndicator() {
  const { isConnected } = useNotifications();

  if (!isConnected) {
    return (
      <div className="bg-yellow-100 text-yellow-800 px-3 py-1 text-sm rounded">
        Real-time updates unavailable. Reconnecting...
      </div>
    );
  }

  return null;
}
```

### 5. Avoid Memory Leaks

Use refs for callbacks that shouldn't trigger re-subscriptions:

```typescript
const onNotificationRef = useRef(onNotification);
onNotificationRef.current = onNotification;

useEffect(() => {
  if (!socket) return;

  const handler = (data: Notification) => {
    onNotificationRef.current?.(data);
  };

  socket.on("notification:new", handler);
  return () => socket.off("notification:new", handler);
}, [socket]); // Only re-subscribe when socket changes
```

## Troubleshooting

### Connection Issues

**Problem**: Socket won't connect

1. Check CORS configuration on backend includes your frontend URL
2. Verify `withCredentials: true` is set
3. Ensure cookies are being sent (check Network tab)
4. Check if user is authenticated (valid session)

**Problem**: Immediate disconnect after connect

1. Authentication may be failing - check server logs
2. Session may have expired - try logging in again
3. Rate limit may be exceeded - wait and retry

### Event Issues

**Problem**: Not receiving events

1. Verify you're subscribed to the correct channel
2. Check event name matches exactly (case-sensitive)
3. Ensure socket is connected before subscribing
4. Check server logs for event emissions

**Problem**: Receiving duplicate events

1. Ensure you're not creating multiple socket instances
2. Check event listeners are cleaned up on unmount
3. Verify singleton pattern is working correctly

### Debugging

Enable Socket.IO debug logs:

```typescript
// In browser console
localStorage.setItem("debug", "socket.io-client:*");

// Or programmatically
import { debug } from "socket.io-client";
debug.enable("*");
```

Check connection in DevTools:
1. Open Network tab
2. Filter by "WS" for WebSocket
3. Click on the WebSocket connection
4. View Messages tab for sent/received frames

---

## Quick Reference

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:channel` | Client → Server | Subscribe to a channel |
| `unsubscribe:channel` | Client → Server | Unsubscribe from channel |
| `mark:read` | Client → Server | Mark notification as read |
| `notification:new` | Server → Client | New notification received |
| `notification:updated` | Server → Client | Notification was updated |
| `error` | Server → Client | Error occurred |

### Channels

| Channel Pattern | Access |
|-----------------|--------|
| `user:{userId}` | Current user only |
| `broadcast` | All authenticated users |
| `user:{userId}:*` | User-specific sub-channels |

### Connection Options

```typescript
{
  withCredentials: true,           // Send cookies
  transports: ["websocket", "polling"],
  reconnection: true,              // Auto-reconnect
  reconnectionAttempts: 5,         // Max retry attempts
  reconnectionDelay: 1000,         // Initial delay (ms)
  reconnectionDelayMax: 5000,      // Max delay (ms)
  timeout: 20000,                  // Connection timeout (ms)
}
```
