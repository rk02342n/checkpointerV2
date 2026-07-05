// Bearer-token auth seam: local JWT verification against an injected JWKS,
// resolveBearerUser (lookup + first-login provisioning via the injected
// userinfo fetcher), resolveBearerViewer, and the csrf-skip for bearer
// requests. Tests target lib/bearer-auth directly — route test files mock
// ../kinde wholesale and bun's module mocks leak across test files, so the
// kinde middlewares themselves can't be reliably imported un-mocked here.
// kinde.ts's bearer branches are thin glue over these functions.

import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

import { testDb, migrateTestDb, resetAndSeed, type Seed } from "./harness";

const TEST_DOMAIN = "https://testkinde.example.com";
process.env.KINDE_DOMAIN = TEST_DOMAIN;
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

mock.module("../db", () => ({ db: testDb }));

const {
  verifyBearerToken,
  resolveBearerUser,
  resolveBearerViewer,
  __setKeyResolverForTests,
  __setProfileFetcherForTests,
} = await import("../lib/bearer-auth");
const { usersTable } = await import("../db/schema/users");
const { eq } = await import("drizzle-orm");

// One RS256 keypair for the whole file; the local JWKS replaces the remote
// Kinde one. A second keypair signs "forged" tokens.
const { publicKey, privateKey } = await generateKeyPair("RS256");
const { privateKey: wrongPrivateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", kid: "test-key" };
__setKeyResolverForTests(createLocalJWKSet({ keys: [jwk] }));

type TokenOverrides = {
  sub?: string | null;
  issuer?: string;
  expiresAt?: string;
  key?: CryptoKey;
  claims?: Record<string, unknown>;
};

async function makeToken(overrides: TokenOverrides = {}): Promise<string> {
  const jwt = new SignJWT(overrides.claims ?? {})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(overrides.issuer ?? TEST_DOMAIN)
    .setIssuedAt()
    .setExpirationTime(overrides.expiresAt ?? "5m");
  if (overrides.sub !== null) {
    jwt.setSubject(overrides.sub ?? "kinde-owner");
  }
  return jwt.sign(overrides.key ?? privateKey);
}

const bearer = (token: string) => `Bearer ${token}`;

let seed: Seed;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  seed = await resetAndSeed();
  __setProfileFetcherForTests(null);
});

describe("verifyBearerToken", () => {
  it("accepts a valid token and returns its kindeId", async () => {
    const result = await verifyBearerToken(await makeToken());
    expect(result?.kindeId).toBe("kinde-owner");
  });

  it("rejects an expired token", async () => {
    const token = await makeToken({ expiresAt: "0s" });
    expect(await verifyBearerToken(token)).toBeNull();
  });

  it("rejects a token from another issuer", async () => {
    const token = await makeToken({ issuer: "https://evil.example.com" });
    expect(await verifyBearerToken(token)).toBeNull();
  });

  it("rejects a token signed with the wrong key", async () => {
    const token = await makeToken({ key: wrongPrivateKey });
    expect(await verifyBearerToken(token)).toBeNull();
  });

  it("rejects a token without a sub", async () => {
    const token = await makeToken({ sub: null });
    expect(await verifyBearerToken(token)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyBearerToken("not-a-jwt")).toBeNull();
  });
});

describe("resolveBearerUser", () => {
  it("resolves an existing user from a valid token", async () => {
    const resolved = await resolveBearerUser(bearer(await makeToken({ sub: "kinde-owner" })));
    expect(resolved?.dbUser.username).toBe("owner");
    expect(resolved?.user.id).toBe("kinde-owner");
  });

  it("returns null for an invalid token", async () => {
    expect(await resolveBearerUser("Bearer garbage")).toBeNull();
  });

  it("surfaces a suspended user's suspendedAt (glue maps it to 403)", async () => {
    await testDb
      .update(usersTable)
      .set({ suspendedAt: new Date() })
      .where(eq(usersTable.kindeId, "kinde-owner"));
    const resolved = await resolveBearerUser(bearer(await makeToken({ sub: "kinde-owner" })));
    expect(resolved?.dbUser.suspendedAt).not.toBeNull();
  });

  it("provisions a first-seen user via the userinfo profile", async () => {
    __setProfileFetcherForTests(async () => ({
      id: "kinde-new",
      email: "newuser@example.com",
      given_name: "New",
      family_name: "User",
      picture: null,
    }));
    const resolved = await resolveBearerUser(bearer(await makeToken({ sub: "kinde-new" })));
    expect(resolved?.dbUser.username).toBe("newuser");
    expect(resolved?.dbUser.displayName).toBe("New User");

    const created = await testDb
      .select()
      .from(usersTable)
      .where(eq(usersTable.kindeId, "kinde-new"));
    expect(created).toHaveLength(1);
  });

  it("returns null for a first-seen user when userinfo fails", async () => {
    __setProfileFetcherForTests(async () => null);
    expect(await resolveBearerUser(bearer(await makeToken({ sub: "kinde-new" })))).toBeNull();
  });

  it("returns null when userinfo returns a mismatched identity", async () => {
    __setProfileFetcherForTests(async () => ({
      id: "kinde-someone-else",
      email: "other@example.com",
      given_name: null,
      family_name: null,
      picture: null,
    }));
    expect(await resolveBearerUser(bearer(await makeToken({ sub: "kinde-new" })))).toBeNull();

    const created = await testDb
      .select()
      .from(usersTable)
      .where(eq(usersTable.kindeId, "kinde-new"));
    expect(created).toHaveLength(0);
  });
});

describe("resolveBearerViewer", () => {
  it("resolves the viewer from a valid token", async () => {
    const viewer = await resolveBearerViewer(bearer(await makeToken({ sub: "kinde-other" })));
    expect(viewer?.username).toBe("other");
  });

  it("reads an invalid token as anonymous", async () => {
    expect(await resolveBearerViewer("Bearer garbage")).toBeNull();
  });

  it("reads an unknown kindeId as anonymous without provisioning", async () => {
    const viewer = await resolveBearerViewer(bearer(await makeToken({ sub: "kinde-stranger" })));
    expect(viewer).toBeNull();

    const created = await testDb
      .select()
      .from(usersTable)
      .where(eq(usersTable.kindeId, "kinde-stranger"));
    expect(created).toHaveLength(0);
  });

  it("reads a suspended user as anonymous", async () => {
    await testDb
      .update(usersTable)
      .set({ suspendedAt: new Date() })
      .where(eq(usersTable.kindeId, "kinde-other"));
    const viewer = await resolveBearerViewer(bearer(await makeToken({ sub: "kinde-other" })));
    expect(viewer).toBeNull();
  });
});

describe("csrf skip for bearer requests", () => {
  // Replicates app.ts's wrapper exactly: csrf for cookie clients, skipped
  // when an Authorization header is present.
  const csrfMiddleware = csrf();
  const app = new Hono();
  app.use("*", (c, next) =>
    c.req.header("authorization") ? next() : csrfMiddleware(c, next)
  );
  app.delete("/thing", (c) => c.json({ ok: true }));

  it("403s a body-less DELETE with no origin (the cookie-client default)", async () => {
    // No Content-Type → hono csrf treats it as text/plain (form-like); no
    // Origin header → blocked. This is the trap native clients would hit.
    const res = await app.request("/thing", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("passes the same request when bearer-authenticated", async () => {
    const res = await app.request("/thing", {
      method: "DELETE",
      headers: { Authorization: "Bearer whatever" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("still passes same-origin browser requests", async () => {
    const res = await app.request("http://localhost/thing", {
      method: "DELETE",
      headers: { origin: "http://localhost" },
    });
    expect(res.status).toBe(200);
  });
});
