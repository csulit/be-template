import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  BASE_URL: z.string().url(),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default("*")
    .transform((s) => (s === "*" ? ["*"] : s.split(",").map((origin) => origin.trim()))),

  // Database
  DATABASE_URL: z.url(),

  // Auth (better-auth)
  AUTH_SECRET: z.string().min(32),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // External Services (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),

  // Observability (optional)
  SENTRY_DSN: z.string().optional(),

  // Redis (for BullMQ job queues)
  REDIS_URL: z.url().default("redis://localhost:6379"),

  // IMAP Configuration (optional)
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_USER: z.string().optional(),
  IMAP_PASS: z.string().optional(),
  IMAP_MAILBOX: z.string().default("INBOX"),

  // OpenAI (optional)
  OPENAI_API_KEY: z.string().optional(),

  // Resend (optional)
  RESEND_API_KEY: z.string().optional(),

  // Socket.IO Configuration
  SOCKET_IO_ENABLED: z.coerce.boolean().default(true),
  SOCKET_IO_PATH: z.string().default("/socket.io"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(z.treeifyError(parsed.error));
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
