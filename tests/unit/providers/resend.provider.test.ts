import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the resend module to prevent actual SDK import issues
vi.mock("resend", () => ({
  Resend: vi.fn(),
}));

// Mock the env module before importing the provider
vi.mock("@/env", () => ({
  env: {
    RESEND_API_KEY: undefined,
  },
}));

import { resendProvider } from "@/providers/resend.provider";

describe("Resend Provider (ConsoleResendProvider)", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("provider export", () => {
    it("should be defined", () => {
      expect(resendProvider).toBeDefined();
    });

    it("should have send method", () => {
      expect(typeof resendProvider.send).toBe("function");
    });
  });

  describe("send", () => {
    it("should return an object with id string when sending with basic options", async () => {
      const result = await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello World</p>",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });

    it("should return an object with id string when sending with text option", async () => {
      const result = await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        text: "Hello World",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });

    it("should log email details to console", async () => {
      await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello World</p>",
      });

      expect(consoleSpy).toHaveBeenCalledWith("Email sent (console provider):");
      expect(consoleSpy).toHaveBeenCalledWith("  From: noreply@example.com");
      expect(consoleSpy).toHaveBeenCalledWith("  To: user@example.com");
      expect(consoleSpy).toHaveBeenCalledWith("  Subject: Test Subject");
    });

    it("should log text body when text is provided", async () => {
      await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        text: "Plain text body",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Body: Plain text body...");
    });

    it("should log html body (truncated to 100 chars) when only html is provided", async () => {
      await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello World</p>",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Body: <p>Hello World</p>...");
    });

    it("should log (empty) when neither text nor html is provided", async () => {
      await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Body: (empty)...");
    });

    it("should handle array to field and log as comma-separated values", async () => {
      await resendProvider.send({
        from: "noreply@example.com",
        to: ["alice@example.com", "bob@example.com"],
        subject: "Test Subject",
        text: "Hello everyone",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  To: alice@example.com, bob@example.com");
    });

    it("should accept all optional fields without errors", async () => {
      const result = await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
        text: "Hello",
        replyTo: "reply@example.com",
        cc: "cc@example.com",
        bcc: ["bcc1@example.com", "bcc2@example.com"],
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
    });

    it("should return different ids for each call", async () => {
      const options = {
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        text: "Hello",
      };

      const result1 = await resendProvider.send(options);
      const result2 = await resendProvider.send(options);

      expect(typeof result1.id).toBe("string");
      expect(typeof result2.id).toBe("string");
      expect(result1.id).not.toBe(result2.id);
    });

    it("should prefer text over html for body logging", async () => {
      await resendProvider.send({
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test Subject",
        text: "Plain text content",
        html: "<p>HTML content</p>",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Body: Plain text content...");
    });
  });
});
