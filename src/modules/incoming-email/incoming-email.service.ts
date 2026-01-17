import { prisma } from "../../db.js";
import { NotFound, Conflict } from "../../lib/errors.js";
import {
  calculatePagination,
  getPrismaSkipTake,
  type PaginatedResult,
} from "../../shared/utils/pagination.js";
import { Prisma, type IncomingEmail, type EmailAttachment } from "../../generated/prisma/client.js";
import type {
  ListIncomingEmailQuery,
  UpdateIncomingEmailBody,
} from "./incoming-email.validator.js";
import { toIncomingEmailResponseDto } from "./incoming-email.dto.js";

// Type for IncomingEmail with attachments included
type IncomingEmailWithAttachments = IncomingEmail & {
  attachments: EmailAttachment[];
};

// Type for parsed email data from IMAP provider
export interface ParsedEmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  storagePath?: string;
}

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  receivedAt: Date;
  metadata?: Record<string, unknown>;
  attachments?: ParsedEmailAttachment[];
}

export class IncomingEmailService {
  /**
   * List incoming emails with pagination and filters
   */
  async list(
    query: ListIncomingEmailQuery
  ): Promise<PaginatedResult<ReturnType<typeof toIncomingEmailResponseDto>>> {
    const where: Prisma.IncomingEmailWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.from && { from: query.from }),
    };

    const [emails, totalItems] = await Promise.all([
      prisma.incomingEmail.findMany({
        where,
        include: { attachments: true },
        ...getPrismaSkipTake(query),
        orderBy: { receivedAt: "desc" },
      }),
      prisma.incomingEmail.count({ where }),
    ]);

    return {
      data: emails.map(toIncomingEmailResponseDto),
      meta: calculatePagination(query, totalItems),
    };
  }

  /**
   * Get a single incoming email by ID
   */
  async getById(id: string): Promise<IncomingEmailWithAttachments> {
    const email = await prisma.incomingEmail.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!email) {
      throw NotFound("Incoming email not found");
    }

    return email;
  }

  /**
   * Update an incoming email's status and/or metadata
   */
  async update(id: string, data: UpdateIncomingEmailBody): Promise<IncomingEmailWithAttachments> {
    // Verify the email exists
    await this.getById(id);

    const updateData: Prisma.IncomingEmailUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
      // Set processedAt when status changes to PROCESSED
      if (data.status === "PROCESSED") {
        updateData.processedAt = new Date();
      }
    }

    if (data.metadata !== undefined) {
      // For nullable JSON fields, use Prisma.DbNull for null values
      updateData.metadata = data.metadata === null ? Prisma.DbNull : data.metadata;
    }

    return prisma.incomingEmail.update({
      where: { id },
      data: updateData,
      include: { attachments: true },
    });
  }

  /**
   * Find an incoming email by its unique messageId
   * Used for duplicate detection when processing IMAP emails
   */
  async findByMessageId(messageId: string): Promise<IncomingEmailWithAttachments | null> {
    return prisma.incomingEmail.findUnique({
      where: { messageId },
      include: { attachments: true },
    });
  }

  /**
   * Process a new email from IMAP provider
   * - Checks for duplicates by messageId
   * - Creates the email record with PROCESSING status
   * - Creates attachment records
   * - Calls handleEmail for custom processing
   * - Updates status to PROCESSED or FAILED
   */
  async processEmail(email: ParsedEmail): Promise<IncomingEmailWithAttachments> {
    // Check for duplicate
    const existing = await this.findByMessageId(email.messageId);
    if (existing) {
      throw Conflict(`Email with messageId ${email.messageId} already exists`);
    }

    // Build create data
    const createData: Prisma.IncomingEmailCreateInput = {
      messageId: email.messageId,
      from: email.from,
      to: email.to,
      cc: email.cc ?? [],
      subject: email.subject ?? null,
      textBody: email.textBody ?? null,
      htmlBody: email.htmlBody ?? null,
      receivedAt: email.receivedAt,
      status: "PROCESSING",
      metadata: email.metadata ? (email.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
    };

    // Add attachments if present
    if (email.attachments && email.attachments.length > 0) {
      createData.attachments = {
        create: email.attachments.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          storagePath: att.storagePath ?? null,
        })),
      };
    }

    // Create the email record with PROCESSING status
    const incomingEmail = await prisma.incomingEmail.create({
      data: createData,
      include: { attachments: true },
    });

    try {
      // Call custom email handling logic
      await this.handleEmail(incomingEmail);

      // Update status to PROCESSED
      return prisma.incomingEmail.update({
        where: { id: incomingEmail.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
        include: { attachments: true },
      });
    } catch (error) {
      // Update status to FAILED with error in metadata
      const existingMetadata = incomingEmail.metadata as Record<string, unknown> | null;
      await prisma.incomingEmail.update({
        where: { id: incomingEmail.id },
        data: {
          status: "FAILED",
          metadata: {
            ...existingMetadata,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });

      throw error;
    }
  }

  /**
   * Custom email handling logic
   * Override this method to implement specific email processing behavior
   */
  protected async handleEmail(_email: IncomingEmailWithAttachments): Promise<void> {
    // Default implementation does nothing
    // Subclass or modify this method to add custom processing logic
    // Examples:
    // - Parse invoice data from attachments
    // - Forward to specific department based on content
    // - Create tickets or tasks based on email content
    // - Extract and store structured data
  }
}

export const incomingEmailService = new IncomingEmailService();
