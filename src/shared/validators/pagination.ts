import { z } from "@hono/zod-openapi";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    example: 1,
    description: "Page number (1-indexed)",
  }),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).openapi({
    example: 20,
    description: "Number of items per page (max 100)",
  }),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
