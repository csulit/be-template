import { z } from "@hono/zod-openapi";

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({
    example: "John Doe",
    description: "User's display name",
  }),
  image: z.string().url().nullable().optional().openapi({
    example: "https://example.com/avatar.jpg",
    description: "Profile image URL",
  }),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
