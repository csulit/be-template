import { z } from "@hono/zod-openapi";

export const IdParamSchema = z.object({
  id: z
    .string()
    .cuid()
    .openapi({
      param: { name: "id", in: "path" },
      example: "clx1234567890abcdef",
      description: "Resource ID",
    }),
});

export type IdParam = z.infer<typeof IdParamSchema>;

export const TimestampSchema = z.object({
  createdAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
});
