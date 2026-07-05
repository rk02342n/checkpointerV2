// Bearer-token auth for native clients (mobile). The web app authenticates
// with Kinde cookie sessions; native apps do Authorization Code + PKCE in-app
// and send the resulting access token as `Authorization: Bearer`. Tokens are
// verified locally against Kinde's JWKS — no per-request Kinde API call.
//
// This module owns the whole bearer side: token verification, user lookup /
// provisioning (resolveBearerUser), and viewer resolution (resolveBearerViewer).
// kinde.ts's middlewares delegate here, keeping the cookie path untouched.
// Living outside kinde.ts also matters for tests: route test files mock
// ../kinde wholesale, and bun's module mocks leak across test files — this
// module stays real so bearer-auth.test.ts exercises the actual logic.

import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { eq } from "drizzle-orm";
import type { UserType } from "@kinde-oss/kinde-typescript-sdk";

import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { getOrCreateDbUser } from "./provision-user";

// createRemoteJWKSet's return type is structurally a superset of
// createLocalJWKSet's, so the local type works for both (and lets tests
// inject a local key set with no network).
type KeyResolver = ReturnType<typeof createLocalJWKSet>;

let keyResolver: KeyResolver | null = null;

// KINDE_DOMAIN is read lazily (not at import) so tests can set a fake domain
// before first use without tripping kinde.ts's module-scope env parse.
function resolver(domain: string): KeyResolver {
  if (!keyResolver) {
    keyResolver = createRemoteJWKSet(new URL(`${domain}/.well-known/jwks`));
  }
  return keyResolver;
}

export function __setKeyResolverForTests(r: KeyResolver | null) {
  keyResolver = r;
}

export type VerifiedBearer = {
  kindeId: string;
  claims: JWTPayload;
};

/**
 * Verify a Kinde access token: RS256 signature against the JWKS, issuer, and
 * expiry. Returns null on any failure — callers translate that to a 401 (or
 * to an anonymous viewer).
 */
export async function verifyBearerToken(token: string): Promise<VerifiedBearer | null> {
  const domain = process.env.KINDE_DOMAIN;
  if (!domain) return null;
  try {
    const { payload } = await jwtVerify(token, resolver(domain), {
      issuer: domain,
      algorithms: ["RS256"],
    });
    if (!payload.sub) return null;
    return { kindeId: payload.sub, claims: payload };
  } catch {
    return null;
  }
}

export type KindeProfile = {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
};

type ProfileFetcher = (token: string) => Promise<KindeProfile | null>;

// Kinde's OIDC userinfo endpoint. Only called when a verified token belongs
// to a kindeId with no users row yet (first login from a native client), so
// provisioning gets the same email/name/picture the cookie path gets from
// getUserProfile.
const fetchProfileFromKinde: ProfileFetcher = async (token) => {
  const domain = process.env.KINDE_DOMAIN;
  if (!domain) return null;
  const res = await fetch(`${domain}/oauth2/v2/user_profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  const id = (data.sub ?? data.id) as string | undefined;
  if (!id) return null;
  return {
    id,
    email: (data.email as string | undefined) ?? null,
    given_name: (data.given_name as string | undefined) ?? null,
    family_name: (data.family_name as string | undefined) ?? null,
    picture: (data.picture as string | undefined) ?? null,
  };
};

let profileFetcher: ProfileFetcher = fetchProfileFromKinde;

export function __setProfileFetcherForTests(f: ProfileFetcher | null) {
  profileFetcher = f ?? fetchProfileFromKinde;
}

export function fetchKindeUserProfile(token: string): Promise<KindeProfile | null> {
  return profileFetcher(token);
}

type DbUser = NonNullable<Awaited<ReturnType<typeof getOrCreateDbUser>>>;

/**
 * Resolve an `Authorization: Bearer …` header to the authenticated user,
 * provisioning a users row on first login. Returns null when the token is
 * invalid or a first-seen identity can't be confirmed via userinfo. The
 * caller decides what a suspended dbUser means (401/403/anonymous).
 */
export async function resolveBearerUser(
  authHeader: string
): Promise<{ user: UserType; dbUser: DbUser } | null> {
  const token = authHeader.slice("Bearer ".length);
  const verified = await verifyBearerToken(token);
  if (!verified) return null;

  let dbUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.kindeId, verified.kindeId))
    .limit(1)
    .then(rows => rows[0]);

  // Access-token claims usually lack profile fields, so first-seen users need
  // one userinfo call to provision with the same email/name the cookie path
  // gets from getUserProfile. Existing users skip it entirely.
  let profile: KindeProfile | null = null;
  if (!dbUser) {
    profile = await fetchKindeUserProfile(token);
    if (!profile || profile.id !== verified.kindeId) return null;
  }

  const user: UserType = {
    id: verified.kindeId,
    email: (verified.claims.email as string | undefined) ?? profile?.email ?? "",
    given_name: profile?.given_name ?? dbUser?.displayName ?? "",
    family_name: profile?.family_name ?? "",
    picture: profile?.picture ?? dbUser?.avatarUrl ?? null,
    phone: "",
  };

  dbUser = dbUser ?? (await getOrCreateDbUser(user));
  return { user, dbUser };
}

/**
 * Viewer resolution for public reads: a valid token for an existing,
 * non-suspended user resolves to that user; anything else is anonymous.
 * Never provisions (read-only, mirroring the cookie viewer branch).
 */
export async function resolveBearerViewer(authHeader: string): Promise<DbUser | null> {
  const verified = await verifyBearerToken(authHeader.slice("Bearer ".length));
  if (!verified) return null;

  const dbUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.kindeId, verified.kindeId))
    .limit(1)
    .then(rows => rows[0]);

  if (!dbUser || dbUser.suspendedAt !== null) return null;
  return dbUser;
}
