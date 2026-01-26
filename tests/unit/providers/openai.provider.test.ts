import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the env module before importing the provider
vi.mock("@/env", () => ({
  env: {
    OPENAI_API_KEY: undefined,
  },
}));

import { openaiProvider } from "@/providers/openai.provider";

describe("OpenAI Provider (ConsoleOpenAIProvider)", () => {
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
      expect(openaiProvider).toBeDefined();
    });

    it("should have chatCompletion method", () => {
      expect(typeof openaiProvider.chatCompletion).toBe("function");
    });

    it("should have ocr method", () => {
      expect(typeof openaiProvider.ocr).toBe("function");
    });
  });

  describe("chatCompletion", () => {
    it("should return mock response with content and usage", async () => {
      const result = await openaiProvider.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result).toEqual({
        content: "Mock chat completion response",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });
    });

    it("should accept all optional fields", async () => {
      const result = await openaiProvider.chatCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello" },
        ],
        temperature: 0.7,
        maxTokens: 500,
        responseSchema: { type: "object", properties: { answer: { type: "string" } } },
      });

      expect(result.content).toBe("Mock chat completion response");
      expect(result.usage.totalTokens).toBe(30);
    });

    it("should log model defaulting to gpt-4o when not specified", async () => {
      await openaiProvider.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(consoleSpy).toHaveBeenCalledWith("Chat completion (console provider):");
      expect(consoleSpy).toHaveBeenCalledWith("  Model: gpt-4o");
    });

    it("should log custom model when specified", async () => {
      await openaiProvider.chatCompletion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Model: gpt-4o-mini");
    });

    it("should log message count", async () => {
      await openaiProvider.chatCompletion({
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
        ],
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Messages: 3");
    });

    it("should log response schema as 'provided' when given", async () => {
      await openaiProvider.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
        responseSchema: { type: "object" },
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Response schema: provided");
    });

    it("should log response schema as 'none' when not given", async () => {
      await openaiProvider.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Response schema: none");
    });
  });

  describe("ocr", () => {
    it("should return mock response with text and usage", async () => {
      const result = await openaiProvider.ocr({
        imageUrl: "https://example.com/image.png",
      });

      expect(result).toEqual({
        text: "Mock OCR extracted text from image",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });
    });

    it("should accept imageUrl option", async () => {
      const result = await openaiProvider.ocr({
        imageUrl: "https://example.com/image.png",
      });

      expect(result.text).toBe("Mock OCR extracted text from image");
    });

    it("should accept imageBase64 option", async () => {
      const result = await openaiProvider.ocr({
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk",
      });

      expect(result.text).toBe("Mock OCR extracted text from image");
    });

    it("should accept imageUrl with prompt option", async () => {
      const result = await openaiProvider.ocr({
        imageUrl: "https://example.com/receipt.png",
        prompt: "Extract the total amount from this receipt.",
      });

      expect(result.text).toBe("Mock OCR extracted text from image");
    });

    it("should log image URL as 'provided' when given", async () => {
      await openaiProvider.ocr({
        imageUrl: "https://example.com/image.png",
      });

      expect(consoleSpy).toHaveBeenCalledWith("OCR (console provider):");
      expect(consoleSpy).toHaveBeenCalledWith("  Image URL: provided");
    });

    it("should log image URL as 'none' when not given", async () => {
      await openaiProvider.ocr({
        imageBase64: "base64data",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Image URL: none");
    });

    it("should log image Base64 as 'provided' when given", async () => {
      await openaiProvider.ocr({
        imageBase64: "base64data",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Image Base64: provided");
    });

    it("should log image Base64 as 'none' when not given", async () => {
      await openaiProvider.ocr({
        imageUrl: "https://example.com/image.png",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Image Base64: none");
    });

    it("should log prompt when provided", async () => {
      await openaiProvider.ocr({
        imageUrl: "https://example.com/image.png",
        prompt: "Extract text from this document.",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Prompt: Extract text from this document.");
    });

    it("should log prompt as 'none' when not provided", async () => {
      await openaiProvider.ocr({
        imageUrl: "https://example.com/image.png",
      });

      expect(consoleSpy).toHaveBeenCalledWith("  Prompt: none");
    });
  });
});
