import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "../../shared/validators/pagination.js";
import { IdParamSchema } from "../../shared/validators/common.js";
import { DocumentTypeEnum } from "./documents.dto.js";

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(255).openapi({
    example: "Purchase Agreement",
    description: "Document title",
  }),
  type: DocumentTypeEnum.openapi({
    example: "contract",
    description: "Document type",
  }),
  content: z.string().optional().openapi({
    example: "Document content...",
    description: "Document content (optional)",
  }),
  url: z.string().url().optional().openapi({
    example: "https://storage.example.com/doc.pdf",
    description: "Document URL (optional)",
  }),
  propertyId: z.string().optional().openapi({
    example: "prop_123",
    description: "Associated property ID (optional)",
  }),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export const UpdateDocumentSchema = CreateDocumentSchema.partial();

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;

export const DocumentParamsSchema = IdParamSchema;

export type DocumentParams = z.infer<typeof DocumentParamsSchema>;

export const DocumentQuerySchema = PaginationQuerySchema.extend({
  type: DocumentTypeEnum.optional().openapi({
    example: "contract",
    description: "Filter by document type",
  }),
});

export type DocumentQuery = z.infer<typeof DocumentQuerySchema>;
