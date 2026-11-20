import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { requestLogger } from "../middleware/request-logger";

describe("requestLogger", () => {
  it("writes JSON with the matched route and response status, not request values", async () => {
    const lines: string[] = [];
    const app = new Hono()
      .use("/api/*", requestLogger((line) => lines.push(line)))
      .get("/api/games/:id", (c) => c.json({ ok: true }));

    const response = await app.request(
      "/api/games/private-game?token=do-not-log",
    );

    expect(response.status).toBe(200);
    expect(lines).toHaveLength(1);

    const log = JSON.parse(lines[0]!);
    expect(log).toMatchObject({
      method: "GET",
      route: "/api/games/:id",
      status: 200,
    });
    expect(log.duration_ms).toEqual(expect.any(Number));
    expect(lines[0]).not.toContain("private-game");
    expect(lines[0]).not.toContain("do-not-log");
  });
});
