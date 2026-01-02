import { z } from "@hono/zod-openapi";
import { createSuccessResponseSchema } from "../../shared/dtos/response.dto.js";
import { createPaginatedResponseSchema } from "../../shared/dtos/pagination.dto.js";

export const DocumentTypeEnum = z.enum(["contract", "invoice", "receipt"]);

export const DocumentSchema = z.object({
  id: z.string().cuid().openapi({ example: "clx1234567890abcdef" }),
  title: z.string().openapi({ example: "Purchase Agreement" }),
  type: DocumentTypeEnum.openapi({ example: "contract" }),
  content: z.string().nullable().openapi({ example: "Document content..." }),
  url: z.string().url().nullable().openapi({ example: "https://storage.example.com/doc.pdf" }),
  propertyId: z.string().nullable().openapi({ example: "prop_123" }),
  userId: z.string().cuid().openapi({ example: "clx1234567890abcdef" }),
  createdAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
});

export type DocumentDTO = z.infer<typeof DocumentSchema>;

export const DocumentResponseSchema = createSuccessResponseSchema(DocumentSchema);
export const DocumentListResponseSchema = createPaginatedResponseSchema(DocumentSchema);
