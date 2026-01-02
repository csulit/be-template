import { z } from "@hono/zod-openapi";

export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().openapi({ example: "NOT_FOUND" }),
  message: z.string().optional().openapi({ example: "Resource not found" }),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      })
    )
    .optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
