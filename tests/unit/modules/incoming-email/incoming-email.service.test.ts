import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing service
vi.mock("@/db", () => ({
  prisma: {
    incomingEmail: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    emailAttachment: {
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/db";
import { IncomingEmailService } from "@/modules/incoming-email/incoming-email.service";

describe("IncomingEmailService", () => {
  const service = new IncomingEmailService();

  const mockAttachment = {
    id: "att_1",
    filename: "document.pdf",
    contentType: "application/pdf",
    size: 1024,
    storagePath: "/attachments/document.pdf",
    emailId: "email_1",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
  };

  const mockEmail = {
    id: "email_1",
    messageId: "<test123@example.com>",
    from: "sender@example.com",
    to: ["recipient@example.com"],
    cc: [],
    subject: "Test Email Subject",
    textBody: "This is a test email body.",
    htmlBody: "<p>This is a test email body.</p>",
    receivedAt: new Date("2024-01-15T10:30:00.000Z"),
    processedAt: null,
    status: "PENDING" as const,
    metadata: null,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
    attachments: [],
  };

  const mockEmailWithAttachments = {
    ...mockEmail,
    attachments: [mockAttachment],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return paginated emails with transformed DTOs", async () => {
      const mockEmails = [mockEmailWithAttachments];

      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue(mockEmails as never);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      // Data should be transformed via toIncomingEmailResponseDto
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "email_1",
        messageId: "<test123@example.com>",
        from: "sender@example.com",
        // Dates should be ISO strings after DTO transformation
        receivedAt: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(result.meta).toMatchObject({
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(prisma.incomingEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          include: { attachments: true },
          orderBy: { receivedAt: "desc" },
        })
      );
    });

    it("should return empty list when no emails exist", async () => {
      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(0);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it("should filter by status", async () => {
      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(0);

      await service.list({ page: 1, pageSize: 20, status: "PROCESSED" });

      expect(prisma.incomingEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "PROCESSED" }),
        })
      );
      expect(prisma.incomingEmail.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: "PROCESSED" }),
      });
    });

    it("should filter by from email", async () => {
      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(0);

      await service.list({ page: 1, pageSize: 20, from: "sender@example.com" });

      expect(prisma.incomingEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ from: "sender@example.com" }),
        })
      );
    });

    it("should combine multiple filters", async () => {
      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(0);

      await service.list({
        page: 1,
        pageSize: 20,
        status: "PENDING",
        from: "sender@example.com",
      });

      expect(prisma.incomingEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PENDING",
            from: "sender@example.com",
          }),
        })
      );
    });

    it("should handle pagination correctly", async () => {
      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue([mockEmailWithAttachments] as never);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(50);

      const result = await service.list({ page: 2, pageSize: 10 });

      expect(result.meta).toMatchObject({
        page: 2,
        pageSize: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
      expect(prisma.incomingEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("should not include filters when not provided", async () => {
      vi.mocked(prisma.incomingEmail.findMany).mockResolvedValue([]);
      vi.mocked(prisma.incomingEmail.count).mockResolvedValue(0);

      await service.list({ page: 1, pageSize: 20 });

      expect(prisma.incomingEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });

  describe("getById", () => {
    it("should return email with attachments when found", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);

      const result = await service.getById("email_1");

      expect(result).toEqual(mockEmailWithAttachments);
      expect(result.attachments).toHaveLength(1);
      expect(prisma.incomingEmail.findUnique).toHaveBeenCalledWith({
        where: { id: "email_1" },
        include: { attachments: true },
      });
    });

    it("should throw NotFound if email does not exist", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);

      await expect(service.getById("nonexistent")).rejects.toThrow("Incoming email not found");
    });

    it("should return email without attachments", async () => {
      const emailNoAttachments = { ...mockEmail, attachments: [] };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(emailNoAttachments as never);

      const result = await service.getById("email_1");

      expect(result.attachments).toHaveLength(0);
    });
  });

  describe("findByMessageId", () => {
    it("should return email when found by messageId", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);

      const result = await service.findByMessageId("<test123@example.com>");

      expect(result).toEqual(mockEmailWithAttachments);
      expect(prisma.incomingEmail.findUnique).toHaveBeenCalledWith({
        where: { messageId: "<test123@example.com>" },
        include: { attachments: true },
      });
    });

    it("should return null when email not found by messageId", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);

      const result = await service.findByMessageId("<nonexistent@example.com>");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update email status", async () => {
      const updatedEmail = { ...mockEmailWithAttachments, status: "PROCESSED" as const };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(updatedEmail as never);

      const result = await service.update("email_1", { status: "PROCESSED" });

      expect(result.status).toBe("PROCESSED");
      expect(prisma.incomingEmail.update).toHaveBeenCalledWith({
        where: { id: "email_1" },
        data: expect.objectContaining({ status: "PROCESSED" }),
        include: { attachments: true },
      });
    });

    it("should update email metadata", async () => {
      const newMetadata = { processedBy: "system", notes: "Test notes" };
      const updatedEmail = { ...mockEmailWithAttachments, metadata: newMetadata };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(updatedEmail as never);

      const result = await service.update("email_1", { metadata: newMetadata });

      expect(result.metadata).toEqual(newMetadata);
      expect(prisma.incomingEmail.update).toHaveBeenCalledWith({
        where: { id: "email_1" },
        data: expect.objectContaining({ metadata: newMetadata }),
        include: { attachments: true },
      });
    });

    it("should update both status and metadata", async () => {
      const newMetadata = { processedBy: "system" };
      const updatedEmail = {
        ...mockEmailWithAttachments,
        status: "PROCESSED" as const,
        metadata: newMetadata,
      };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(updatedEmail as never);

      const result = await service.update("email_1", {
        status: "PROCESSED",
        metadata: newMetadata,
      });

      expect(result.status).toBe("PROCESSED");
      expect(result.metadata).toEqual(newMetadata);
    });

    it("should throw NotFound if email does not exist", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { status: "PROCESSED" })
      ).rejects.toThrow("Incoming email not found");
    });

    it("should set processedAt when status changes to PROCESSED", async () => {
      const updatedEmail = {
        ...mockEmailWithAttachments,
        status: "PROCESSED" as const,
        processedAt: new Date(),
      };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(updatedEmail as never);

      await service.update("email_1", { status: "PROCESSED" });

      expect(prisma.incomingEmail.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PROCESSED",
            processedAt: expect.any(Date),
          }),
        })
      );
    });

    it("should not set processedAt for other status changes", async () => {
      const updatedEmail = {
        ...mockEmailWithAttachments,
        status: "PROCESSING" as const,
      };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(updatedEmail as never);

      await service.update("email_1", { status: "PROCESSING" });

      const updateCall = vi.mocked(prisma.incomingEmail.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("processedAt");
    });

    it("should allow setting metadata to null", async () => {
      const emailWithMetadata = {
        ...mockEmailWithAttachments,
        metadata: { existing: "data" },
      };
      const updatedEmail = { ...emailWithMetadata, metadata: null };
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(emailWithMetadata as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(updatedEmail as never);

      const result = await service.update("email_1", { metadata: null });

      expect(result.metadata).toBeNull();
    });

    it("should not update fields that are not provided", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmailWithAttachments as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(mockEmailWithAttachments as never);

      await service.update("email_1", {});

      const updateCall = vi.mocked(prisma.incomingEmail.update).mock.calls[0][0];
      expect(updateCall.data).toEqual({});
    });
  });

  describe("processEmail", () => {
    const emailData = {
      messageId: "<new123@example.com>",
      from: "sender@example.com",
      to: ["recipient@example.com"],
      cc: [] as string[],
      subject: "New Email",
      textBody: "Email content",
      htmlBody: "<p>Email content</p>",
      receivedAt: new Date("2024-01-15T12:00:00.000Z"),
    };

    it("should create a new email record with PROCESSING status", async () => {
      const createdEmail = {
        ...mockEmail,
        ...emailData,
        status: "PROCESSING" as const,
        attachments: [],
      };
      const processedEmail = {
        ...createdEmail,
        status: "PROCESSED" as const,
        processedAt: new Date(),
      };

      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incomingEmail.create).mockResolvedValue(createdEmail as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(processedEmail as never);

      const result = await service.processEmail(emailData);

      expect(result).toBeDefined();
      expect(result.status).toBe("PROCESSED");
      expect(prisma.incomingEmail.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId: emailData.messageId,
          from: emailData.from,
          to: emailData.to,
          status: "PROCESSING",
        }),
        include: { attachments: true },
      });
    });

    it("should throw Conflict error for duplicate email by messageId", async () => {
      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(mockEmail as never);

      await expect(service.processEmail(emailData)).rejects.toThrow(
        `Email with messageId ${emailData.messageId} already exists`
      );
      expect(prisma.incomingEmail.create).not.toHaveBeenCalled();
    });

    it("should create email with nested attachments", async () => {
      const emailWithAttachments = {
        ...emailData,
        attachments: [
          {
            filename: "file.pdf",
            contentType: "application/pdf",
            size: 2048,
            storagePath: "/attachments/file.pdf",
          },
        ],
      };

      const createdEmail = {
        ...mockEmail,
        ...emailData,
        status: "PROCESSING" as const,
        attachments: [{ ...mockAttachment, ...emailWithAttachments.attachments[0] }],
      };
      const processedEmail = {
        ...createdEmail,
        status: "PROCESSED" as const,
        processedAt: new Date(),
      };

      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incomingEmail.create).mockResolvedValue(createdEmail as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(processedEmail as never);

      const result = await service.processEmail(emailWithAttachments);

      expect(result).toBeDefined();
      expect(result.attachments).toHaveLength(1);
      expect(prisma.incomingEmail.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          attachments: {
            create: expect.arrayContaining([
              expect.objectContaining({
                filename: "file.pdf",
                contentType: "application/pdf",
                size: 2048,
              }),
            ]),
          },
        }),
        include: { attachments: true },
      });
    });

    it("should update status to FAILED when handleEmail throws", async () => {
      const createdEmail = {
        ...mockEmail,
        ...emailData,
        status: "PROCESSING" as const,
        attachments: [],
      };

      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incomingEmail.create).mockResolvedValue(createdEmail as never);
      // First update is for failure status, second would be for success
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(createdEmail as never);

      // Use a subclass to test the error handling
      class TestService extends IncomingEmailService {
        protected async handleEmail(): Promise<void> {
          throw new Error("Processing failed");
        }
      }

      const testService = new TestService();

      await expect(testService.processEmail(emailData)).rejects.toThrow("Processing failed");

      // Should have attempted to update status to FAILED
      expect(prisma.incomingEmail.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: createdEmail.id },
          data: expect.objectContaining({
            status: "FAILED",
          }),
        })
      );
    });

    it("should update status to PROCESSED after successful handleEmail", async () => {
      const createdEmail = {
        ...mockEmail,
        ...emailData,
        status: "PROCESSING" as const,
        attachments: [],
      };
      const processedEmail = {
        ...createdEmail,
        status: "PROCESSED" as const,
        processedAt: new Date(),
      };

      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incomingEmail.create).mockResolvedValue(createdEmail as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(processedEmail as never);

      const result = await service.processEmail(emailData);

      expect(result.status).toBe("PROCESSED");
      expect(prisma.incomingEmail.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: createdEmail.id },
          data: expect.objectContaining({
            status: "PROCESSED",
            processedAt: expect.any(Date),
          }),
        })
      );
    });

    it("should handle email without optional fields", async () => {
      const minimalEmailData = {
        messageId: "<minimal@example.com>",
        from: "sender@example.com",
        to: ["recipient@example.com"],
        receivedAt: new Date("2024-01-15T12:00:00.000Z"),
      };

      const createdEmail = {
        ...mockEmail,
        ...minimalEmailData,
        cc: [],
        subject: null,
        textBody: null,
        htmlBody: null,
        metadata: null,
        status: "PROCESSING" as const,
        attachments: [],
      };
      const processedEmail = {
        ...createdEmail,
        status: "PROCESSED" as const,
        processedAt: new Date(),
      };

      vi.mocked(prisma.incomingEmail.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incomingEmail.create).mockResolvedValue(createdEmail as never);
      vi.mocked(prisma.incomingEmail.update).mockResolvedValue(processedEmail as never);

      const result = await service.processEmail(minimalEmailData);

      expect(result).toBeDefined();

      // Verify the create call was made with correct structure
      expect(prisma.incomingEmail.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageId: minimalEmailData.messageId,
            from: minimalEmailData.from,
            to: minimalEmailData.to,
            cc: [],
            subject: null,
            textBody: null,
            htmlBody: null,
            status: "PROCESSING",
          }),
          include: { attachments: true },
        })
      );
    });
  });
});
