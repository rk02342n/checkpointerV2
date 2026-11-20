import type { MiddlewareHandler } from "hono";
import { routePath } from "hono/route";

type LogWriter = (line: string) => void;

export function requestLogger(write: LogWriter = console.log): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = performance.now();

    await next();

    const matchedRoute = routePath(c);
    const log = {
      method: c.req.method,
      route: matchedRoute === "*" ? "unmatched" : matchedRoute,
      status: c.res.status,
      duration_ms: Math.round(performance.now() - startedAt),
    };

    write(JSON.stringify(log));
  };
}
