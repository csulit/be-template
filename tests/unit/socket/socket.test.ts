import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Socket.IO Server class
const mockClose = vi.fn((callback: () => void) => callback());
const mockOf = vi.fn();
const mockOn = vi.fn();

class MockSocketIOServer {
  close = mockClose;
  of = mockOf;
  on = mockOn;
  sockets = { sockets: new Map() };
  _nsps = new Map();

  constructor() {
    // No-op constructor
  }
}

vi.mock("socket.io", () => ({
  Server: MockSocketIOServer,
}));

// Mock the env module
vi.mock("@/env", () => ({
  env: {
    CORS_ORIGINS: ["http://localhost:3000"],
    SOCKET_IO_PATH: "/socket.io",
    SOCKET_IO_ENABLED: true,
  },
}));

describe("Socket Server Singleton", () => {
  let socketModule: typeof import("@/socket");
  let mockHttpServer: ReturnType<typeof createMockHttpServer>;

  function createMockHttpServer() {
    return {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      removeListener: vi.fn(),
      emit: vi.fn(),
      listeners: vi.fn().mockReturnValue([]),
      address: vi.fn().mockReturnValue({ port: 3000 }),
    } as unknown as import("node:http").Server;
  }

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    mockClose.mockImplementation((callback: () => void) => callback());

    // Reset modules to get fresh imports
    vi.resetModules();
    socketModule = await import("@/socket");
    mockHttpServer = createMockHttpServer();
  });

  describe("getIO", () => {
    it("should throw error when not initialized", () => {
      expect(() => socketModule.getIO()).toThrow(
        "Socket.IO not initialized. Call createSocketServer first."
      );
    });
  });

  describe("createSocketServer", () => {
    it("should create socket server with HTTP server", () => {
      const io = socketModule.createSocketServer(mockHttpServer);

      expect(io).toBeDefined();
      expect(typeof io.of).toBe("function");
      expect(typeof io.on).toBe("function");
    });

    it("should return same instance on subsequent calls", () => {
      const io1 = socketModule.createSocketServer(mockHttpServer);
      const io2 = socketModule.createSocketServer(mockHttpServer);

      expect(io1).toBe(io2);
    });

    it("should allow getIO after creation", () => {
      socketModule.createSocketServer(mockHttpServer);

      expect(() => socketModule.getIO()).not.toThrow();
    });
  });

  describe("closeSocketServer", () => {
    it("should close the socket server", async () => {
      socketModule.createSocketServer(mockHttpServer);

      await socketModule.closeSocketServer();

      expect(mockClose).toHaveBeenCalled();
      // After closing, getIO should throw
      expect(() => socketModule.getIO()).toThrow(
        "Socket.IO not initialized. Call createSocketServer first."
      );
    });

    it("should handle closing when not initialized", async () => {
      // Should not throw
      await expect(socketModule.closeSocketServer()).resolves.toBeUndefined();
    });
  });
});
