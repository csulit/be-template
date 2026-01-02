import { describe, it, expect } from "vitest";
import { createTestClient } from "../../helpers/test-client.js";

describe("Health Routes", () => {
  const client = createTestClient();

  describe("GET /health", () => {
    it("should return status ok", async () => {
      const res = await client.health.$get();

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        status: "ok",
        timestamp: expect.any(String),
      });
    });
  });
});
