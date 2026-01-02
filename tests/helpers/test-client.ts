import { testClient } from "hono/testing";
import { createApp } from "../../src/app.js";

export function createTestClient() {
  const app = createApp();
  return testClient(app);
}

export type TestClient = ReturnType<typeof createTestClient>;
