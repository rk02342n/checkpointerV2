import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// Typed throwers over Hono's HTTPException, plus the single error handler that
// renders them into the app's `{ error }` response shape. This is the seed of
// standardized error handling — manual `c.json({ error }, code)` returns can
// migrate to throws over time. A machine-readable `code` field is deferred
// until a frontend needs to switch on it (see CONTEXT.md, "Error-handler seam").

export function notFound(message = "Not found"): HTTPException {
  return new HTTPException(404, { message });
}

export function forbidden(message = "Forbidden"): HTTPException {
  return new HTTPException(403, { message });
}

/**
 * The error-handler seam: one place where a thrown error becomes a response.
 * Registered via `app.onError`; shared by the app and its tests so the real
 * rendering is exercised.
 */
export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
}
