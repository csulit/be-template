import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const ErrorCode = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends HTTPException {
  public readonly code: ErrorCodeType;

  constructor(code: ErrorCodeType, status: ContentfulStatusCode, message?: string) {
    super(status, { message: message ?? code });
    this.code = code;
  }
}

// Factory functions for common errors
export const NotFound = (message?: string) => new AppError(ErrorCode.NOT_FOUND, 404, message);

export const BadRequest = (message?: string) => new AppError(ErrorCode.INVALID_INPUT, 400, message);

export const Unauthorized = (message?: string) =>
  new AppError(ErrorCode.UNAUTHORIZED, 401, message);

export const Forbidden = (message?: string) => new AppError(ErrorCode.FORBIDDEN, 403, message);

export const Conflict = (message?: string) => new AppError(ErrorCode.CONFLICT, 409, message);

export const InternalError = (message?: string) =>
  new AppError(ErrorCode.INTERNAL_ERROR, 500, message);
