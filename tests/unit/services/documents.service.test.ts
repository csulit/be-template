import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("../../../src/db.js", () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import after mocking
import { prisma } from "../../../src/db.js";
import { DocumentsService } from "../../../src/modules/documents/documents.service.js";

describe("DocumentsService", () => {
  const service = new DocumentsService();
  const mockUserId = "user_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return paginated documents", async () => {
      const mockDocuments = [
        {
          id: "doc_1",
          title: "Test Document",
          type: "contract",
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as never);
      vi.mocked(prisma.document.count).mockResolvedValue(1);

      const result = await service.list(mockUserId, { page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockDocuments);
      expect(result.meta).toMatchObject({
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });
  });

  describe("getById", () => {
    it("should return document if owned by user", async () => {
      const mockDocument = {
        id: "doc_1",
        title: "Test Document",
        type: "contract",
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as never);

      const result = await service.getById("doc_1", mockUserId);

      expect(result).toEqual(mockDocument);
    });

    it("should throw NotFound if document does not exist", async () => {
      vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

      await expect(service.getById("doc_1", mockUserId)).rejects.toThrow();
    });

    it("should throw Forbidden if document belongs to another user", async () => {
      const mockDocument = {
        id: "doc_1",
        title: "Test Document",
        type: "contract",
        userId: "other_user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as never);

      await expect(service.getById("doc_1", mockUserId)).rejects.toThrow();
    });
  });
});
