import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import * as Sentry from "@sentry/node";
import { env } from "../env.js";
import { AppError, ErrorCode } from "../lib/errors.js";

// Zod v4 compatibility - check for issues or errors property
function getZodErrors(err: Error): Array<{ path: string[]; message: string }> | null {
  if ("issues" in err && Array.isArray((err as { issues: unknown }).issues)) {
    return (err as { issues: Array<{ path: string[]; message: string }> }).issues;
  }
  if ("errors" in err && Array.isArray((err as { errors: unknown }).errors)) {
    return (err as { errors: Array<{ path: string[]; message: string }> }).errors;
  }
  return null;
}

function isZodError(err: Error): boolean {
  return err.name === "ZodError" || getZodErrors(err) !== null;
}

export function errorHandler(err: Error, c: Context) {
  // Capture in Sentry (server errors only)
  if (env.SENTRY_DSN && (!(err instanceof HTTPException) || err.status >= 500)) {
    Sentry.captureException(err);
  }

  // Zod validation error
  if (isZodError(err)) {
    const zodErrors = getZodErrors(err);
    return c.json(
      {
        success: false,
        error: ErrorCode.VALIDATION_ERROR,
        details: zodErrors?.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      400
    );
  }

  // App error (our custom errors)
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: err.code,
        message: err.message !== err.code ? err.message : undefined,
      },
      err.status
    );
  }

  // HTTPException (from Hono or other middleware)
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: err.message,
      },
      err.status
    );
  }

  // Unknown error
  console.error("Unhandled error:", err);

  return c.json(
    {
      success: false,
      error: env.NODE_ENV === "production" ? ErrorCode.INTERNAL_ERROR : err.message,
      ...(env.NODE_ENV !== "production" && { stack: err.stack }),
    },
    500
  );
}
