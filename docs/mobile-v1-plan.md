# Checkpointer Mobile — v1 Plan

*Date: 2026-07-04. Decisions reached interactively (grill session); grounded in `docs/technical-audit.md` and direct inspection of `server/kinde.ts`, `server/app.ts`, and the web frontend's Hono RPC setup.*

> **Status (2026-07-05): built.** All five milestones are code-complete; `checkpointer-mobile/README.md` is now the canonical doc for setup, architecture, and the dependency gotchas discovered during the build. Deviations from this plan as written:
> - Scaffolded on **Expo SDK 57** (released the same week); the phone's Expo Go must match — an older-iOS device silently gets an older Expo Go from the App Store and refuses the project.
> - The server bearer branch lives in **`server/lib/bearer-auth.ts` + `server/lib/provision-user.ts`** rather than inline in `kinde.ts` — bun test module mocks leak across test files, so testable logic had to move out of the wholesale-mocked `../kinde` module. `kinde.ts` keeps thin branch glue; the cookie path is verbatim-unchanged.
> - `@kinde/expo` worked, but needed three interventions (SDK-55 dep overrides, a `bun patch` for a Hermes-fatal dynamic import, a local `.d.ts` for its broken published types) — detailed in the mobile README's Gotchas table.
> - EAS/TestFlight is deferred: no Apple Developer Program enrollment yet. Milestone 5 shipped as the styling/states pass only.

## Decisions (settled)

| Decision | Choice |
|---|---|
| v1 scope | Three pillars: **search + game pages**, **logging loop + wishlist**, **ratings/reviews + likes**. Steam (read-only) + Insights deferred to v1.1. Lists, blog, theming, follows, admin: out. |
| Entry | **Login-gated** — one auth wall at launch, every screen assumes a session. |
| Auth | **Kinde PKCE in-app** (`@kinde/expo`, fallback `expo-auth-session` manual PKCE), tokens in `expo-secure-store`, sent as `Authorization: Bearer`. Server gets an **additive** bearer branch; the web cookie path stays byte-for-byte untouched. |
| Structure | `checkpointer-mobile/` in this repo as its own package (own `package.json`, no formal workspace). Type-only `import type { ApiRoutes } from "../server/app"`; `hc<ApiRoutes>(API_URL, { headers })`. |
| Platforms | iOS + Android. Develop in **Expo Go**; real builds via **EAS Build** (cloud — avoids the Ventura/Xcode ceiling). Distribute to self via TestFlight/internal track. Store release is a later milestone. |
| UI stack | **Expo Router** (file-based) + **NativeWind v4**, porting the neobrutalist `.surface` design language (hard offset shadows, square corners, border-2 inputs — see `docs`/memory conventions). |
| Data layer | **TanStack Query**, same patterns as web (always handle `isPending` + `isError` + `data`). |

## Server changes (small, all additive)

1. **Bearer branch in `getAuthUser` / `getOptionalViewer`** (`server/kinde.ts`)
   - If `Authorization: Bearer <jwt>` is present, verify locally with `jose` `createRemoteJWKSet` against `https://<KINDE_DOMAIN>/.well-known/jwks.json` (keys cached in-process — no per-request Kinde network call). Otherwise fall through to the existing cookie path unchanged.
   - Resolve `dbUser` by `kindeId = payload.sub`. **First-seen-user provisioning:** the access token may not carry email/name claims, so on a `sub` with no `users` row, call Kinde's `/oauth2/user_profile` (userinfo) endpoint once with the presented token to get the profile fields needed by `generateUsername` — mirrors the existing get-or-create.
   - Suspended check identical to cookie path.
2. **CSRF skip for bearer requests** (`server/app.ts`)
   - Verified gotcha: Hono's `csrf()` defaults a *missing* Content-Type to `text/plain`, which matches its form regex — so body-less mobile `DELETE`/`POST` requests (no Origin header from native fetch) get 403'd. Wrap the middleware: `if (c.req.header("authorization")) return next(); return csrfMw(c, next);` — CSRF only defends cookie auth, so this is principled, not a bypass.
3. **CORS** — no change. Native clients send no Origin and don't enforce CORS.
4. **Tests** — extend the existing middleware test suite with bearer-branch cases: valid JWT, expired, wrong issuer/audience, first-seen provisioning, suspended user, body-less DELETE passing CSRF.

## Mobile app structure

```
checkpointer-mobile/
  app.json / package.json / tailwind.config.js / tsconfig.json  (paths → ../server for types)
  app/
    _layout.tsx          # providers: QueryClient, Kinde/auth, theme
    login.tsx            # the auth wall
    (tabs)/
      _layout.tsx        # tab bar
      index.tsx          # Home: trending / top-rated rails
      search.tsx         # catalog search (debounced, typo-tolerant server-side)
      library.tsx        # segmented: Playing / Finished / Stashed / Want-to-play
      profile.tsx        # minimal: identity, logout, (later: settings)
    game/[id].tsx        # game page: details, log actions, wishlist toggle, review feed
    game/[id]/review.tsx # write/edit review (modal)
  lib/
    api.ts               # hc<ApiRoutes> with base URL from env + bearer header injection
    auth.tsx             # Kinde session, secure-store token persistence, refresh
    queries/             # queryOptions per domain, mirroring web patterns
  components/
    surface/             # neobrutalist primitives: Surface, Button, Input, StarRating
```

- **Env:** `EXPO_PUBLIC_API_URL` — LAN IP of the dev server for Expo Go, `https://checkpointer.io` for builds.
- **Kinde config:** create a **new native application** in the Kinde dashboard (custom scheme redirect, e.g. `checkpointer://callback`); the web app's client is untouched.
- **Type imports:** `import type { X }` only (never `import { type X }`), per existing convention — and type-only imports mean Metro never bundles server code.

## Milestones

1. **Scaffold** — `create-expo-app`, Expo Router, NativeWind, tsconfig path wiring; prove a typed `hc` call compiles against `ApiRoutes`.
2. **Auth end-to-end** — Kinde native app, login screen, PKCE flow, secure-store persistence, server bearer branch + CSRF skip + tests. *Exit criterion: `GET /api/user/account` returns your account on-device.*
3. **Read surfaces** — Home rails, search, game page (details + review feed, read-only).
4. **Write surfaces** — logging loop (playing/finished/stashed, log past game), wishlist toggle, write/delete review, like/unlike. Optimistic updates where cheap.
5. **Polish + build** — neobrutalist pass, empty/error states everywhere, EAS build, TestFlight/internal distribution.

## Known risks / open items

- **`@kinde/expo` maturity** — verify it works in Expo Go at milestone 2; fallback is a manual PKCE flow via `expo-auth-session` (well-trodden).
- **Token refresh** — mobile sessions are long-lived; the auth layer must refresh the access token via the refresh token before expiry (Kinde SDK handles this; verify).
- **Userinfo provisioning** — confirm which claims Kinde puts in the access token vs. requires userinfo for.
- **Game cover images** — confirm covers are absolute IGDB CDN URLs (fine in RN `<Image>`); anything served through the app server works too since reads are public.
- **v1.1 queue** — Steam read-only tab + Insights; lists (view-only first); Sign in with Apple (required by App Store review if Kinde offers Google login) before any store release.
