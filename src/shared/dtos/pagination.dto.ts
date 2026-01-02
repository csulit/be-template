import { z } from "@hono/zod-openapi";

export const PaginationMetaSchema = z.object({
  page: z.number().int().openapi({ example: 1 }),
  pageSize: z.number().int().openapi({ example: 20 }),
  totalItems: z.number().int().openapi({ example: 100 }),
  totalPages: z.number().int().openapi({ example: 5 }),
  hasNextPage: z.boolean().openapi({ example: true }),
  hasPreviousPage: z.boolean().openapi({ example: false }),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}
