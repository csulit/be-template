import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock objects
const mockEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
const mockFetchSockets = vi.fn().mockResolvedValue([]);
const mockNamespace = {
  to: mockTo,
  emit: mockEmit,
  fetchSockets: mockFetchSockets,
};

const mockIO = {
  of: vi.fn().mockReturnValue(mockNamespace),
  sockets: { sockets: new Map() },
  _nsps: new Map([
    ["/", {}],
    ["/notifications", {}],
  ]),
};

vi.mock("@/socket", () => ({
  getIO: vi.fn(() => mockIO),
}));

import {
  emitToUser,
  emitToBroadcast,
  emitToRoom,
  getNamespaceSocketCount,
  getSocketIOHealth,
} from "@/socket/utils";
import { getIO } from "@/socket";

describe("Socket Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    mockTo.mockReturnValue({ emit: mockEmit });
    mockFetchSockets.mockResolvedValue([]);
    mockIO.of.mockReturnValue(mockNamespace);
    mockIO.sockets.sockets = new Map();
    mockIO._nsps = new Map([
      ["/", {}],
      ["/notifications", {}],
    ]);
    vi.mocked(getIO).mockReturnValue(mockIO as ReturnType<typeof getIO>);
  });

  describe("emitToUser", () => {
    it("should emit to user channel", () => {
      const data = { message: "Hello" };
      emitToUser("/notifications", "user-123", "notification:new", data);

      expect(mockIO.of).toHaveBeenCalledWith("/notifications");
      expect(mockTo).toHaveBeenCalledWith("user:user-123");
      expect(mockEmit).toHaveBeenCalledWith("notification:new", data);
    });
  });

  describe("emitToBroadcast", () => {
    it("should emit to all clients in namespace", () => {
      const data = { message: "Broadcast" };
      emitToBroadcast("/notifications", "announcement", data);

      expect(mockIO.of).toHaveBeenCalledWith("/notifications");
      expect(mockEmit).toHaveBeenCalledWith("announcement", data);
    });
  });

  describe("emitToRoom", () => {
    it("should emit to specific room", () => {
      const data = { message: "Room message" };
      emitToRoom("/notifications", "room-abc", "message", data);

      expect(mockIO.of).toHaveBeenCalledWith("/notifications");
      expect(mockTo).toHaveBeenCalledWith("room-abc");
      expect(mockEmit).toHaveBeenCalledWith("message", data);
    });
  });

  describe("getNamespaceSocketCount", () => {
    it("should return socket count for namespace", async () => {
      mockFetchSockets.mockResolvedValueOnce([{}, {}, {}]);

      const count = await getNamespaceSocketCount("/notifications");

      expect(mockIO.of).toHaveBeenCalledWith("/notifications");
      expect(count).toBe(3);
    });

    it("should return 0 for empty namespace", async () => {
      mockFetchSockets.mockResolvedValueOnce([]);

      const count = await getNamespaceSocketCount("/notifications");

      expect(count).toBe(0);
    });
  });

  describe("getSocketIOHealth", () => {
    it("should return health information", () => {
      mockIO.sockets.sockets = new Map([
        ["socket-1", {}],
        ["socket-2", {}],
      ]);

      const health = getSocketIOHealth();

      expect(health.connected).toBe(2);
      expect(health.namespaces).toContain("/");
      expect(health.namespaces).toContain("/notifications");
    });

    it("should return empty health when io throws", () => {
      vi.mocked(getIO).mockImplementation(() => {
        throw new Error("Not initialized");
      });

      const health = getSocketIOHealth();

      expect(health.connected).toBe(0);
      expect(health.namespaces).toEqual([]);
    });
  });
});
