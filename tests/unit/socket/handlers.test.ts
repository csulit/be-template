import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleSubscribeChannel,
  handleUnsubscribeChannel,
  handleMarkRead,
} from "@/socket/namespaces/notifications/notifications.handlers";
import type { AuthenticatedSocket } from "@/socket/types";

describe("Notification Socket Handlers", () => {
  let mockSocket: AuthenticatedSocket;

  beforeEach(() => {
    mockSocket = {
      id: "test-socket-id",
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          role: "user",
        },
        sessionId: "session-123",
      },
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
    } as unknown as AuthenticatedSocket;
  });

  describe("handleSubscribeChannel", () => {
    it("should join valid user channel", async () => {
      const callback = vi.fn();
      await handleSubscribeChannel(mockSocket, { channel: "user:user-123" }, callback);

      expect(mockSocket.join).toHaveBeenCalledWith("user:user-123");
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it("should join broadcast channel", async () => {
      const callback = vi.fn();
      await handleSubscribeChannel(mockSocket, { channel: "broadcast" }, callback);

      expect(mockSocket.join).toHaveBeenCalledWith("broadcast");
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it("should join user sub-channel", async () => {
      const callback = vi.fn();
      await handleSubscribeChannel(mockSocket, { channel: "user:user-123:documents" }, callback);

      expect(mockSocket.join).toHaveBeenCalledWith("user:user-123:documents");
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it("should reject invalid channel access", async () => {
      const callback = vi.fn();
      await handleSubscribeChannel(mockSocket, { channel: "user:other-user" }, callback);

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Access denied to channel",
        code: "FORBIDDEN",
      });
      expect(callback).toHaveBeenCalledWith({ success: false });
    });

    it("should reject invalid channel data", async () => {
      const callback = vi.fn();
      await handleSubscribeChannel(mockSocket, { channel: "" }, callback);

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid channel data",
        code: "VALIDATION_ERROR",
      });
      expect(callback).toHaveBeenCalledWith({ success: false });
    });

    it("should handle missing data", async () => {
      const callback = vi.fn();
      await handleSubscribeChannel(mockSocket, null, callback);

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid channel data",
        code: "VALIDATION_ERROR",
      });
      expect(callback).toHaveBeenCalledWith({ success: false });
    });

    it("should work without callback", async () => {
      await handleSubscribeChannel(mockSocket, { channel: "user:user-123" });

      expect(mockSocket.join).toHaveBeenCalledWith("user:user-123");
    });
  });

  describe("handleUnsubscribeChannel", () => {
    it("should leave channel", async () => {
      await handleUnsubscribeChannel(mockSocket, { channel: "user:user-123" });

      expect(mockSocket.leave).toHaveBeenCalledWith("user:user-123");
    });

    it("should reject invalid channel data", async () => {
      await handleUnsubscribeChannel(mockSocket, { channel: "" });

      expect(mockSocket.leave).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid channel data",
        code: "VALIDATION_ERROR",
      });
    });

    it("should handle missing data", async () => {
      await handleUnsubscribeChannel(mockSocket, undefined);

      expect(mockSocket.leave).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid channel data",
        code: "VALIDATION_ERROR",
      });
    });
  });

  describe("handleMarkRead", () => {
    it("should accept valid notification id", async () => {
      const notificationId = "550e8400-e29b-41d4-a716-446655440000";
      await handleMarkRead(mockSocket, { notificationId });

      // Currently just logs, no error emitted
      expect(mockSocket.emit).not.toHaveBeenCalledWith("error", expect.anything());
    });

    it("should reject invalid notification id", async () => {
      await handleMarkRead(mockSocket, { notificationId: "invalid-uuid" });

      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid notification data",
        code: "VALIDATION_ERROR",
      });
    });

    it("should reject missing notification id", async () => {
      await handleMarkRead(mockSocket, {});

      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid notification data",
        code: "VALIDATION_ERROR",
      });
    });
  });
});
