import { describe, it, expect } from "vitest";
import { isRetryableJsonError } from "../../../../src/jobs/tms-market-scope/tms-market-scope.worker.js";

describe("tms-market-scope.worker", () => {
  describe("isRetryableJsonError", () => {
    describe("should return true for retryable JSON errors", () => {
      it("handles 'bad unicode escape' errors", () => {
        const error = new Error("SyntaxError: Bad unicode escape at position 42");
        expect(isRetryableJsonError(error)).toBe(true);
      });

      it("handles 'Bad Unicode Escape' errors (case insensitive)", () => {
        const error = new Error("Bad Unicode Escape sequence found");
        expect(isRetryableJsonError(error)).toBe(true);
      });

      it("handles 'invalid output type' errors", () => {
        const error = new Error("Invalid output type: expected JSON but got text");
        expect(isRetryableJsonError(error)).toBe(true);
      });

      it("handles 'unexpected token' errors", () => {
        const error = new Error("Unexpected token < in JSON at position 0");
        expect(isRetryableJsonError(error)).toBe(true);
      });

      it("handles 'json at position' errors", () => {
        const error = new Error("Failed to parse JSON at position 156");
        expect(isRetryableJsonError(error)).toBe(true);
      });

      it("handles mixed case error messages", () => {
        const error = new Error("UNEXPECTED TOKEN in JSON AT POSITION 10");
        expect(isRetryableJsonError(error)).toBe(true);
      });
    });

    describe("should return false for non-retryable errors", () => {
      it("returns false for network errors", () => {
        const error = new Error("ECONNREFUSED: Connection refused");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("returns false for timeout errors", () => {
        const error = new Error("Request timeout after 30000ms");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("returns false for authentication errors", () => {
        const error = new Error("API key is invalid or expired");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("returns false for rate limit errors", () => {
        const error = new Error("Rate limit exceeded. Please retry after 60 seconds");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("returns false for generic errors", () => {
        const error = new Error("Something went wrong");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("returns false for errors with similar but different messages", () => {
        const error = new Error("Invalid JSON schema provided");
        expect(isRetryableJsonError(error)).toBe(false);
      });
    });

    describe("should handle non-Error inputs", () => {
      it("returns false for null", () => {
        expect(isRetryableJsonError(null)).toBe(false);
      });

      it("returns false for undefined", () => {
        expect(isRetryableJsonError(undefined)).toBe(false);
      });

      it("returns false for strings", () => {
        expect(isRetryableJsonError("bad unicode escape")).toBe(false);
      });

      it("returns false for numbers", () => {
        expect(isRetryableJsonError(42)).toBe(false);
      });

      it("returns false for plain objects", () => {
        expect(isRetryableJsonError({ message: "bad unicode escape" })).toBe(false);
      });

      it("returns false for arrays", () => {
        expect(isRetryableJsonError(["bad unicode escape"])).toBe(false);
      });
    });

    describe("should handle edge cases", () => {
      it("handles empty error message", () => {
        const error = new Error("");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("handles error with only whitespace", () => {
        const error = new Error("   ");
        expect(isRetryableJsonError(error)).toBe(false);
      });

      it("handles error message with multiple matching patterns", () => {
        const error = new Error("Bad unicode escape and unexpected token in JSON at position 10");
        expect(isRetryableJsonError(error)).toBe(true);
      });
    });
  });
});
