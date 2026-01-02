import { beforeAll, afterAll } from "vitest";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.BASE_URL = "http://localhost:3000";
process.env.AUTH_SECRET = "test-secret-key-at-least-32-characters-long";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

beforeAll(async () => {
  // Global test setup
  console.log("🧪 Starting tests...");
});

afterAll(async () => {
  // Global test cleanup
  console.log("🧪 Tests completed.");
});
