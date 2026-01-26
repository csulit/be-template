import { betterAuth } from "better-auth";
import {
  admin,
  apiKey,
  twoFactor,
  magicLink,
  organization,
  multiSession,
  haveIBeenPwned,
  lastLoginMethod,
} from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../db.js";
import { env } from "../env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: env.BASE_URL,
  secret: env.AUTH_SECRET,

  advanced: {
    database: {
      generateId: false,
    },
  },

  appName: "My App",
  plugins: [
    admin(),
    apiKey(),
    twoFactor(),
    organization(),
    multiSession(),
    haveIBeenPwned(),
    lastLoginMethod(),
    magicLink({
      sendMagicLink: async ({ email, token, url }, _ctx) => {
        // send email to user
        console.log(`Magic link for ${email}: ${url}`);
        console.log(`Token: ${token}`);
      },
    }),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Inject email provider here
      console.log(`Password reset for ${user.email}: ${url}`);
    },
  },

  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
});

// Export types for use in middleware and routes
export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
