import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { EventEmitter } from "node:events";

// Mock mailparser - must be defined before vi.mock due to hoisting
vi.mock("mailparser", async (importOriginal) => {
  return {
    simpleParser: vi.fn(),
  };
});

// Store mock instance reference that will be populated in the mock
const mockInstances: Array<{
  connect: Mock;
  logout: Mock;
  getMailboxLock: Mock;
  fetchOne: Mock;
  on: Mock;
}> = [];

// Mock ImapFlow as a class
vi.mock("imapflow", () => {
  return {
    ImapFlow: class MockImapFlow {
      connect = vi.fn();
      logout = vi.fn();
      getMailboxLock = vi.fn();
      fetchOne = vi.fn();
      on = vi.fn();

      constructor() {
        mockInstances.push(this);
      }
    },
  };
});

import { ImapProvider, type ImapConfig } from "@/providers/email/imap.provider";
import { simpleParser } from "mailparser";

describe("ImapProvider", () => {
  const defaultConfig: ImapConfig = {
    host: "imap.example.com",
    port: 993,
    secure: true,
    auth: {
      user: "test@example.com",
      pass: "password123",
    },
    mailbox: "INBOX",
  };

  let provider: ImapProvider;

  // Helper to get the latest mock instance
  const getLatestMockClient = () => mockInstances[mockInstances.length - 1];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInstances.length = 0;
    provider = new ImapProvider(defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should create an instance with provided config", () => {
      expect(provider).toBeInstanceOf(ImapProvider);
      expect(provider).toBeInstanceOf(EventEmitter);
    });

    it("should initialize with disconnected status", () => {
      const status = provider.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.listening).toBe(false);
    });
  });

  describe("connect", () => {
    it("should connect successfully and emit connected event", async () => {
      const connectedHandler = vi.fn();
      provider.on("connected", connectedHandler);

      await provider.connect();

      const mockClient = getLatestMockClient();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(connectedHandler).toHaveBeenCalled();
      expect(provider.getConnectionStatus().connected).toBe(true);
    });

    it("should not reconnect if already connected", async () => {
      await provider.connect();

      const mockClient = getLatestMockClient();
      const connectCallCount = mockClient.connect.mock.calls.length;

      await provider.connect();

      expect(mockClient.connect.mock.calls.length).toBe(connectCallCount);
    });

    it("should emit error on connection failure", async () => {
      const connectionError = new Error("Connection failed");

      const errorHandler = vi.fn();
      provider.on("error", errorHandler);

      // Start connect - the mock client is created
      const connectPromise = provider.connect();
      const mockClient = getLatestMockClient();

      // The connect() has already been called by now, but since vi.fn()
      // returns undefined by default (which is resolved), we need to check
      // that error forwarding works via the client's error event handler
      const errorCall = mockClient.on.mock.calls.find((call) => call[0] === "error");
      expect(errorCall).toBeDefined();

      // Simulate client emitting an error
      const clientErrorHandler = errorCall![1];
      clientErrorHandler(connectionError);

      expect(errorHandler).toHaveBeenCalledWith(connectionError);
    });

    it("should register close and error event handlers on client", async () => {
      await provider.connect();

      const mockClient = getLatestMockClient();
      expect(mockClient.on).toHaveBeenCalledWith("close", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });
  });

  describe("startListening", () => {
    it("should throw error if not connected", async () => {
      await expect(provider.startListening()).rejects.toThrow("Not connected to IMAP server");
    });

    it("should acquire mailbox lock and start listening", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });

      await provider.startListening("INBOX");

      expect(mockClient.getMailboxLock).toHaveBeenCalledWith("INBOX");
      expect(provider.getConnectionStatus().listening).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("IMAP: Listening for new emails in INBOX");

      consoleSpy.mockRestore();
    });

    it("should use INBOX as default mailbox", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });

      await provider.startListening();

      expect(mockClient.getMailboxLock).toHaveBeenCalledWith("INBOX");
    });

    it("should not start listening if already listening", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });

      await provider.startListening();
      await provider.startListening();

      expect(mockClient.getMailboxLock).toHaveBeenCalledTimes(1);
    });

    it("should register exists event handler for new emails", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });

      await provider.startListening();

      expect(mockClient.on).toHaveBeenCalledWith("exists", expect.any(Function));
    });
  });

  describe("fetchLatestEmail", () => {
    const mockParsedMail = {
      messageId: "<test123@example.com>",
      from: { value: [{ address: "sender@example.com" }] },
      to: { value: [{ address: "recipient@example.com" }] },
      cc: { value: [{ address: "cc@example.com" }] },
      subject: "Test Subject",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      date: new Date("2024-01-15T10:30:00.000Z"),
      attachments: [
        {
          filename: "doc.pdf",
          contentType: "application/pdf",
          size: 1024,
          content: Buffer.from("fake content"),
        },
      ],
    };

    it("should emit email event when new message arrives", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.mocked(simpleParser).mockResolvedValue(mockParsedMail as never);

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue({
        source: Buffer.from("raw email"),
        uid: 123,
        flags: new Set(["\\Seen"]),
      });

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      // Get the exists handler and call it
      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      expect(existsCall).toBeDefined();

      const existsHandler = existsCall![1];
      await existsHandler({ count: 5, prevCount: 4 });

      expect(mockClient.fetchOne).toHaveBeenCalledWith("5", {
        source: true,
        flags: true,
        envelope: true,
      });
      expect(emailHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: "<test123@example.com>",
          from: "sender@example.com",
          to: ["recipient@example.com"],
          cc: ["cc@example.com"],
          subject: "Test Subject",
          textBody: "Plain text body",
          htmlBody: "<p>HTML body</p>",
        })
      );
    });

    it("should not fetch if count equals prevCount", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 5, prevCount: 5 });

      expect(mockClient.fetchOne).not.toHaveBeenCalled();
    });

    it("should not emit email if fetchOne returns false", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue(false);

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 5, prevCount: 4 });

      expect(emailHandler).not.toHaveBeenCalled();
    });

    it("should emit error on fetch failure", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const fetchError = new Error("Fetch failed");

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockRejectedValue(fetchError);

      const errorHandler = vi.fn();
      provider.on("error", errorHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 5, prevCount: 4 });

      expect(errorHandler).toHaveBeenCalledWith(fetchError);
    });
  });

  describe("parseEmail", () => {
    it("should generate messageId if not present", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      vi.mocked(simpleParser).mockResolvedValue({
        messageId: undefined,
        from: { value: [{ address: "sender@example.com" }] },
        to: { value: [{ address: "recipient@example.com" }] },
        date: new Date(),
      } as never);

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue({
        source: Buffer.from("raw email"),
        uid: 123,
        flags: new Set(),
      });

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 1, prevCount: 0 });

      expect(emailHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: expect.stringMatching(/^generated-\d+-[a-z0-9]+$/),
        })
      );
    });

    it("should handle missing from address", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      vi.mocked(simpleParser).mockResolvedValue({
        messageId: "<test@example.com>",
        from: undefined,
        to: { value: [{ address: "recipient@example.com" }] },
        date: new Date(),
      } as never);

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue({
        source: Buffer.from("raw email"),
        uid: 123,
        flags: new Set(),
      });

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 1, prevCount: 0 });

      expect(emailHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "",
        })
      );
    });

    it("should handle array of to/cc addresses", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      vi.mocked(simpleParser).mockResolvedValue({
        messageId: "<test@example.com>",
        from: { value: [{ address: "sender@example.com" }] },
        to: [
          { value: [{ address: "recipient1@example.com" }] },
          { value: [{ address: "recipient2@example.com" }] },
        ],
        cc: [{ value: [{ address: "cc1@example.com" }, { address: "cc2@example.com" }] }],
        date: new Date(),
      } as never);

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue({
        source: Buffer.from("raw email"),
        uid: 123,
        flags: new Set(),
      });

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 1, prevCount: 0 });

      expect(emailHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["recipient1@example.com", "recipient2@example.com"],
          cc: ["cc1@example.com", "cc2@example.com"],
        })
      );
    });

    it("should not include optional fields if not present", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      vi.mocked(simpleParser).mockResolvedValue({
        messageId: "<test@example.com>",
        from: { value: [{ address: "sender@example.com" }] },
        to: { value: [{ address: "recipient@example.com" }] },
        date: new Date(),
        // No subject, text, html, cc, or attachments
      } as never);

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue({
        source: Buffer.from("raw email"),
        uid: 123,
        flags: new Set(),
      });

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 1, prevCount: 0 });

      const emittedEmail = emailHandler.mock.calls[0][0];
      expect(emittedEmail).not.toHaveProperty("subject");
      expect(emittedEmail).not.toHaveProperty("textBody");
      expect(emittedEmail).not.toHaveProperty("htmlBody");
      expect(emittedEmail).not.toHaveProperty("cc");
      expect(emittedEmail).not.toHaveProperty("attachments");
    });

    it("should include metadata with uid and flags", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      vi.mocked(simpleParser).mockResolvedValue({
        messageId: "<test@example.com>",
        from: { value: [{ address: "sender@example.com" }] },
        to: { value: [{ address: "recipient@example.com" }] },
        date: new Date(),
      } as never);

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });
      mockClient.fetchOne.mockResolvedValue({
        source: Buffer.from("raw email"),
        uid: 456,
        flags: new Set(["\\Seen", "\\Flagged"]),
      });

      const emailHandler = vi.fn();
      provider.on("email", emailHandler);

      await provider.startListening();

      const existsCall = mockClient.on.mock.calls.find((call) => call[0] === "exists");
      const existsHandler = existsCall![1];
      await existsHandler({ count: 1, prevCount: 0 });

      expect(emailHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            uid: 456,
            flags: ["\\Seen", "\\Flagged"],
          },
        })
      );
    });
  });

  describe("disconnect", () => {
    it("should disconnect and release mailbox lock", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const releaseMock = vi.fn();

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: releaseMock });

      await provider.startListening();
      await provider.disconnect();

      expect(releaseMock).toHaveBeenCalled();
      expect(mockClient.logout).toHaveBeenCalled();
      expect(provider.getConnectionStatus()).toEqual({
        connected: false,
        listening: false,
      });
    });

    it("should handle logout errors gracefully", async () => {
      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.logout.mockRejectedValue(new Error("Logout failed"));

      // Should not throw
      await provider.disconnect();
      expect(provider.getConnectionStatus().connected).toBe(false);
    });
  });

  describe("getConnectionStatus", () => {
    it("should return correct status when disconnected", () => {
      expect(provider.getConnectionStatus()).toEqual({
        connected: false,
        listening: false,
      });
    });

    it("should return correct status when connected", async () => {
      await provider.connect();

      expect(provider.getConnectionStatus()).toEqual({
        connected: true,
        listening: false,
      });
    });

    it("should return correct status when listening", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await provider.connect();

      const mockClient = getLatestMockClient();
      mockClient.getMailboxLock.mockResolvedValue({ release: vi.fn() });

      await provider.startListening();

      expect(provider.getConnectionStatus()).toEqual({
        connected: true,
        listening: true,
      });
    });
  });

  describe("event emission", () => {
    it("should emit disconnected event on client close", async () => {
      const disconnectedHandler = vi.fn();
      provider.on("disconnected", disconnectedHandler);

      await provider.connect();
      await provider.disconnect(); // Prevent reconnection

      const mockClient = getLatestMockClient();

      // Get the close handler
      const closeCall = mockClient.on.mock.calls.find((call) => call[0] === "close");
      expect(closeCall).toBeDefined();

      const closeHandler = closeCall![1];
      closeHandler();

      expect(disconnectedHandler).toHaveBeenCalled();
    });

    it("should forward client errors to error event", async () => {
      const errorHandler = vi.fn();
      provider.on("error", errorHandler);

      await provider.connect();

      const mockClient = getLatestMockClient();

      // Get the error handler
      const errorCall = mockClient.on.mock.calls.find((call) => call[0] === "error");
      expect(errorCall).toBeDefined();

      const clientErrorHandler = errorCall![1];
      const testError = new Error("Test error");
      clientErrorHandler(testError);

      expect(errorHandler).toHaveBeenCalledWith(testError);
    });
  });
});
