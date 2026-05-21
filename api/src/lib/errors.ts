import type { Context } from "hono";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(c: Context, status: number, code: ApiErrorCode, message: string) {
  return c.json({ error: { code, message } }, status as never);
}

export function badRequest(message: string) {
  return new ApiError(400, "BAD_REQUEST", message);
}
export function unauthorized(message = "Please sign in again.") {
  return new ApiError(401, "UNAUTHORIZED", message);
}
export function forbidden(message = "You do not have permission to do that.") {
  return new ApiError(403, "FORBIDDEN", message);
}
export function notFound(message = "The requested item was not found.") {
  return new ApiError(404, "NOT_FOUND", message);
}
export function conflict(message: string) {
  return new ApiError(409, "CONFLICT", message);
}
