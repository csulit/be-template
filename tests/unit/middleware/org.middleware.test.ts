import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("../../../src/db.js", () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
    },
    reimbursementRole: {
      findUnique: vi.fn(),
    },
  },
}));

import { orgGuard } from "../../../src/middleware/org.middleware.js";
import { prisma } from "../../../src/db.js";

function createTestApp(options: Parameters<typeof orgGuard>[0]) {
  const app = new Hono();

  // Simulate authMiddleware by setting user context
  app.use("*", async (c, next) => {
    c.set("user", { id: "user_1", email: "test@example.com", role: "user" });
    c.set("session", { id: "session_1" });
    await next();
  });

  if (options.source.from === "resource") {
    app.use("/test/:id", orgGuard(options));
  } else {
    app.use("*", orgGuard(options));
  }

  app.get("/test", (c) => c.json({ ok: true }));
  app.get("/test/:id", (c) => c.json({ ok: true }));
  app.post("/test", async (c) => c.json({ ok: true }));

  return app;
}

const mockMember = {
  id: "member_1",
  organizationId: "org_1",
  userId: "user_1",
  role: "admin",
  createdAt: new Date("2024-01-15T10:30:00.000Z"),
};

describe("orgGuard middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Query source
  // ==========================================================================

  describe("source: query", () => {
    it("should pass when user is a member (from query)", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMember as never);

      const app = createTestApp({ source: { from: "query" } });
      const res = await app.request("/test?organizationId=org_1");

      expect(res.status).toBe(200);
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { userId: "user_1", organizationId: "org_1" },
      });
    });

    it("should return 400 when organizationId is missing from query", async () => {
      const app = createTestApp({ source: { from: "query" } });
      const res = await app.request("/test");

      expect(res.status).toBe(400);
    });

    it("should return 403 when user is not a member (from query)", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      const app = createTestApp({ source: { from: "query" } });
      const res = await app.request("/test?organizationId=org_1");

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // Body source
  // ==========================================================================

  describe("source: body", () => {
    it("should pass when user is a member (from body)", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMember as never);

      const app = createTestApp({ source: { from: "body" } });
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: "org_1" }),
      });

      expect(res.status).toBe(200);
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { userId: "user_1", organizationId: "org_1" },
      });
    });

    it("should return 400 when organizationId is missing from body", async () => {
      const app = createTestApp({ source: { from: "body" } });
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test" }),
      });

      expect(res.status).toBe(400);
    });

    it("should return 403 when user is not a member (from body)", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      const app = createTestApp({ source: { from: "body" } });
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: "org_1" }),
      });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // Resource source
  // ==========================================================================

  describe("source: resource", () => {
    it("should pass when resource found and user is a member", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue({
        organizationId: "org_1",
      } as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMember as never);

      const app = createTestApp({
        source: { from: "resource", table: "reimbursementRole" },
      });
      const res = await app.request("/test/role_1");

      expect(res.status).toBe(200);
      expect(prisma.reimbursementRole.findUnique).toHaveBeenCalledWith({
        where: { id: "role_1" },
        select: { organizationId: true },
      });
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { userId: "user_1", organizationId: "org_1" },
      });
    });

    it("should return 404 when resource is not found", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null);

      const app = createTestApp({
        source: { from: "resource", table: "reimbursementRole" },
      });
      const res = await app.request("/test/nonexistent_id");

      expect(res.status).toBe(404);
    });

    it("should return 403 when user is not a member of the resource's org", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue({
        organizationId: "org_other",
      } as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      const app = createTestApp({
        source: { from: "resource", table: "reimbursementRole" },
      });
      const res = await app.request("/test/role_1");

      expect(res.status).toBe(403);
    });

    it("should use custom idParam when specified", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue({
        organizationId: "org_1",
      } as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMember as never);

      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("user", { id: "user_1", email: "test@example.com", role: "user" });
        c.set("session", { id: "session_1" });
        await next();
      });
      app.use(
        "/test/:roleId",
        orgGuard({
          source: { from: "resource", table: "reimbursementRole", idParam: "roleId" },
        })
      );
      app.get("/test/:roleId", (c) => c.json({ ok: true }));

      const res = await app.request("/test/role_1");
      expect(res.status).toBe(200);
      expect(prisma.reimbursementRole.findUnique).toHaveBeenCalledWith({
        where: { id: "role_1" },
        select: { organizationId: true },
      });
    });
  });

  // ==========================================================================
  // Role checking
  // ==========================================================================

  describe("role-based access", () => {
    it("should pass when user has an allowed role", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMember as never);

      const app = createTestApp({
        source: { from: "query" },
        roles: ["admin", "owner"],
      });
      const res = await app.request("/test?organizationId=org_1");

      expect(res.status).toBe(200);
    });

    it("should return 403 when user role is not in allowed roles", async () => {
      const memberRole = { ...mockMember, role: "member" };
      vi.mocked(prisma.member.findFirst).mockResolvedValue(memberRole as never);

      const app = createTestApp({
        source: { from: "query" },
        roles: ["admin", "owner"],
      });
      const res = await app.request("/test?organizationId=org_1");

      expect(res.status).toBe(403);
    });

    it("should pass when no roles restriction is specified", async () => {
      const memberRole = { ...mockMember, role: "member" };
      vi.mocked(prisma.member.findFirst).mockResolvedValue(memberRole as never);

      const app = createTestApp({ source: { from: "query" } });
      const res = await app.request("/test?organizationId=org_1");

      expect(res.status).toBe(200);
    });

    it("should pass when roles array is empty", async () => {
      const memberRole = { ...mockMember, role: "member" };
      vi.mocked(prisma.member.findFirst).mockResolvedValue(memberRole as never);

      const app = createTestApp({
        source: { from: "query" },
        roles: [],
      });
      const res = await app.request("/test?organizationId=org_1");

      expect(res.status).toBe(200);
    });
  });
});
