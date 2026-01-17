import { z } from "@hono/zod-openapi";
import { createSuccessResponseSchema } from "../../shared/dtos/response.dto.js";
import { createPaginatedResponseSchema } from "../../shared/dtos/pagination.dto.js";
import type { IncomingEmail, EmailAttachment } from "../../generated/prisma/client.js";

// ============================================================================
// Enums
// ============================================================================

export const IncomingEmailStatusEnum = z.enum(["PENDING", "PROCESSING", "PROCESSED", "FAILED"]);

// ============================================================================
// Attachment Schema
// ============================================================================

export const EmailAttachmentSchema = z.object({
  id: z.string().cuid().openapi({
    description: "Unique identifier for the attachment",
    example: "clx1234567890abcdef",
  }),
  filename: z.string().openapi({
    description: "Original filename of the attachment",
    example: "document.pdf",
  }),
  contentType: z.string().openapi({
    description: "MIME type of the attachment",
    example: "application/pdf",
  }),
  size: z.number().int().openapi({
    description: "File size in bytes",
    example: 1024000,
  }),
  storagePath: z.string().nullable().openapi({
    description: "Storage path for the attachment file",
    example: "/attachments/2024/01/document.pdf",
  }),
  createdAt: z.string().datetime().openapi({
    description: "Timestamp when the attachment was created",
    example: "2024-01-15T10:30:00.000Z",
  }),
});

export type EmailAttachmentDTO = z.infer<typeof EmailAttachmentSchema>;

// ============================================================================
// Incoming Email Schema
// ============================================================================

export const IncomingEmailSchema = z.object({
  id: z.string().cuid().openapi({
    description: "Unique identifier for the incoming email",
    example: "clx1234567890abcdef",
  }),
  messageId: z.string().openapi({
    description: "Unique message ID from the email header",
    example: "<abc123@mail.example.com>",
  }),
  from: z.string().openapi({
    description: "Sender email address",
    example: "sender@example.com",
  }),
  to: z.array(z.string()).openapi({
    description: "List of recipient email addresses",
    example: ["recipient1@example.com", "recipient2@example.com"],
  }),
  cc: z.array(z.string()).openapi({
    description: "List of CC recipient email addresses",
    example: ["cc@example.com"],
  }),
  subject: z.string().nullable().openapi({
    description: "Email subject line",
    example: "Important Document",
  }),
  textBody: z.string().nullable().openapi({
    description: "Plain text body of the email",
    example: "Hello, please find attached the document.",
  }),
  htmlBody: z.string().nullable().openapi({
    description: "HTML body of the email",
    example: "<p>Hello, please find attached the document.</p>",
  }),
  receivedAt: z.string().datetime().openapi({
    description: "Timestamp when the email was received",
    example: "2024-01-15T10:30:00.000Z",
  }),
  processedAt: z.string().datetime().nullable().openapi({
    description: "Timestamp when the email was processed",
    example: "2024-01-15T10:31:00.000Z",
  }),
  status: IncomingEmailStatusEnum.openapi({
    description: "Current processing status of the email",
    example: "PROCESSED",
  }),
  metadata: z
    .any()
    .nullable()
    .openapi({
      description: "Additional metadata associated with the email (JSON object)",
      example: { priority: "high", category: "invoice" },
    }),
  attachments: z.array(EmailAttachmentSchema).openapi({
    description: "List of email attachments",
  }),
  createdAt: z.string().datetime().openapi({
    description: "Timestamp when the record was created",
    example: "2024-01-15T10:30:00.000Z",
  }),
  updatedAt: z.string().datetime().openapi({
    description: "Timestamp when the record was last updated",
    example: "2024-01-15T10:31:00.000Z",
  }),
});

export type IncomingEmailDTO = z.infer<typeof IncomingEmailSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const IncomingEmailResponseSchema = IncomingEmailSchema;
export const IncomingEmailSuccessResponseSchema = createSuccessResponseSchema(IncomingEmailSchema);
export const IncomingEmailListResponseSchema = createPaginatedResponseSchema(IncomingEmailSchema);
export const EmailAttachmentResponseSchema = EmailAttachmentSchema;

export type IncomingEmailResponse = z.infer<typeof IncomingEmailResponseSchema>;
export type IncomingEmailListResponse = z.infer<typeof IncomingEmailListResponseSchema>;

// ============================================================================
// Type Definitions for Database Records with Relations
// ============================================================================

type IncomingEmailWithAttachments = IncomingEmail & {
  attachments: EmailAttachment[];
};

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transform an EmailAttachment database record to response DTO
 */
export function toEmailAttachmentResponseDto(attachment: EmailAttachment): EmailAttachmentDTO {
  return {
    id: attachment.id,
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    storagePath: attachment.storagePath,
    createdAt: attachment.createdAt.toISOString(),
  };
}

/**
 * Transform an IncomingEmail database record to response DTO
 */
export function toIncomingEmailResponseDto(email: IncomingEmailWithAttachments): IncomingEmailDTO {
  return {
    id: email.id,
    messageId: email.messageId,
    from: email.from,
    to: email.to,
    cc: email.cc,
    subject: email.subject,
    textBody: email.textBody,
    htmlBody: email.htmlBody,
    receivedAt: email.receivedAt.toISOString(),
    processedAt: email.processedAt?.toISOString() ?? null,
    status: email.status,
    metadata: email.metadata as Record<string, unknown> | null,
    attachments: email.attachments.map(toEmailAttachmentResponseDto),
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
  };
}

/**
 * Transform a list of IncomingEmail records with pagination metadata
 */
export function toIncomingEmailListResponseDto(
  emails: IncomingEmailWithAttachments[],
  total: number,
  page: number,
  pageSize: number
): IncomingEmailListResponse {
  const totalPages = Math.ceil(total / pageSize);

  return {
    success: true,
    data: emails.map(toIncomingEmailResponseDto),
    meta: {
      page,
      pageSize,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
