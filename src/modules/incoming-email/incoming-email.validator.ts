import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "../../shared/validators/pagination.js";
import { IdParamSchema } from "../../shared/validators/common.js";

/**
 * Enum for IncomingEmail status matching Prisma schema
 */
export const IncomingEmailStatusEnum = z.enum(["PENDING", "PROCESSING", "PROCESSED", "FAILED"]);

export type IncomingEmailStatus = z.infer<typeof IncomingEmailStatusEnum>;

/**
 * Schema for PATCH request body to update incoming email status
 */
export const UpdateIncomingEmailBodySchema = z.object({
  status: IncomingEmailStatusEnum.optional().openapi({
    description: "Status of the incoming email",
    example: "PROCESSED",
  }),
  metadata: z
    .any()
    .nullable()
    .optional()
    .openapi({
      description: "Additional metadata as JSON object",
      example: { processedBy: "system", notes: "Processed successfully" },
    }),
});

export type UpdateIncomingEmailBody = z.infer<typeof UpdateIncomingEmailBodySchema>;

/**
 * Schema for URL params (id)
 */
export const IncomingEmailParamsSchema = IdParamSchema;

export type IncomingEmailParams = z.infer<typeof IncomingEmailParamsSchema>;

/**
 * Schema for GET list query params
 */
export const ListIncomingEmailQuerySchema = PaginationQuerySchema.extend({
  status: IncomingEmailStatusEnum.optional().openapi({
    description: "Filter by email status",
    example: "PENDING",
  }),
  from: z.string().email().optional().openapi({
    description: "Filter by sender email address",
    example: "sender@example.com",
  }),
});

export type ListIncomingEmailQuery = z.infer<typeof ListIncomingEmailQuerySchema>;
