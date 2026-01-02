import { z } from "@hono/zod-openapi";
import { createSuccessResponseSchema } from "../../shared/dtos/response.dto.js";

export const UserSchema = z.object({
  id: z.string().cuid().openapi({ example: "clx1234567890abcdef" }),
  name: z.string().openapi({ example: "John Doe" }),
  email: z.string().email().openapi({ example: "john@example.com" }),
  emailVerified: z.boolean().openapi({ example: true }),
  image: z.string().url().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
  role: z.string().openapi({ example: "user" }),
  createdAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
});

export type UserDTO = z.infer<typeof UserSchema>;

export const UserResponseSchema = createSuccessResponseSchema(UserSchema);

export const UserProfileSchema = UserSchema.omit({ emailVerified: true });

export const UserProfileResponseSchema = createSuccessResponseSchema(UserProfileSchema);
