import { z } from "zod";

/**
 * Schema for example job data.
 * Used to validate job payloads at runtime.
 */
export const ExampleJobDataSchema = z.object({
  message: z.string(),
  userId: z.string().uuid().optional(),
});

export type ExampleJobData = z.infer<typeof ExampleJobDataSchema>;
