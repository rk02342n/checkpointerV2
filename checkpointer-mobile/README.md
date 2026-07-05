# Checkpointer Mobile

The native companion app for [Checkpointer](https://checkpointer.io) — React Native + Expo (SDK 57), talking to the same Hono backend as the web app with full end-to-end types.

**v1 scope (deliberate):** search & game pages · the logging loop (playing / finished / stashed + log past games) & wishlist · ratings, reviews & likes. The app is login-gated — there is no anonymous mode. Steam (read-only) and Insights are queued for v1.1; lists, blog, theming, and social are out until then. Decision history: `docs/mobile-v1-plan.md`.

## Prerequisites

1. **The backend running locally** — `bun dev` at the repo root (serves the API on port 3000).
2. **A Kinde native application.** In the Kinde dashboard: Add application → type **Native**. Do **not** reuse the web app's client — it has a client secret and browser callbacks; the native app uses PKCE with no secret.
3. **Expo Go** on your phone — the App Store/Play Store build must match the project's SDK (57). Expo Go only ever supports one SDK version; an older phone OS can silently get an older Expo Go from the store, which then refuses the project.

## Setup

```bash
cd checkpointer-mobile
bun install
cp .env.example .env   # then fill in:
```

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_KINDE_DOMAIN` | Same Kinde domain the server uses, e.g. `https://yourbusiness.kinde.com` |
| `EXPO_PUBLIC_KINDE_CLIENT_ID` | The **native** app's client ID |
| `EXPO_PUBLIC_API_URL` | Leave unset for Expo Go dev (see below). Set to `https://checkpointer.io` for real builds. |

In the Kinde native app's settings, add the **allowed callback and logout redirect URLs**. For Expo Go development that's `exp://<your-LAN-IP>:8081`; if Kinde rejects a login, its error page shows the exact URI it wanted — paste that in. (Standalone builds will use the `checkpointermobile://` scheme from `app.json` instead.)

## Running

```bash
bun run start        # expo start — scan the QR with your phone's camera
```

- **API base URL in dev**: you don't configure one. The app derives your Mac's LAN IP from Expo's dev-server host (`Constants.expoConfig.hostUri`) and calls port 3000 on it — so the phone reaches your local server as long as both are on the same network.
- **The web preview (`w`) cannot log in** — Kinde tokens live in `expo-secure-store`, which is native-only. The login screen says so. Test auth flows on the phone.
- Type-check with `bunx tsc --noEmit`; a full bundle sanity-check is `bunx expo export --platform ios --output-dir /tmp/export-test`.

## Architecture

```
src/
├── app/                        # expo-router routes
│   ├── _layout.tsx             # providers (Kinde, React Query) + auth Gate + root Stack
│   ├── (tabs)/                 # Home · Search · Library (native tab bar)
│   └── game/[id].tsx           # game page: details, actions, review feed
├── components/
│   ├── ui.tsx                  # THE design-system owner (see below)
│   ├── game-card.tsx           # rail cover card    ─┐ both link to /game/[id]
│   ├── game-row.tsx            # list row            ─┘ shared by Search + Library
│   ├── game-actions.tsx        # play/stop/log + wishlist toggle
│   ├── review-composer.tsx     # rating chips + text, or your existing review
│   └── login-screen.tsx        # the auth wall
├── lib/
│   ├── api.ts                  # hc<ApiRoutes> client (see Typed API)
│   └── queries/                # queryOptions + mutation hooks per domain
└── types/kinde.d.ts            # workaround for @kinde/js-utils' broken types
```

### Auth (Kinde PKCE → bearer JWT)

`@kinde/expo`'s `KindeAuthProvider` runs Authorization Code + PKCE in-app and persists tokens in secure storage with auto-refresh. Every API request pulls the current access token via `getRawToken()` and sends it as `Authorization: Bearer`. Server-side, `server/lib/bearer-auth.ts` verifies the JWT locally against Kinde's JWKS (no per-request Kinde call) and provisions first-time users through one userinfo call — the web app's cookie sessions are untouched. See "Bearer auth" in `CONTEXT.md`.

### Typed API

`src/lib/api.ts` creates `hc<ApiRoutes>` with a **type-only** import from `../server/app` — Metro never bundles server code, but every route's request/response types flow into the app. Query files mirror the web frontend's patterns (`queryOptions` per domain, always handle `isPending`/`isError`/`data`).

### Design system (`src/components/ui.tsx`)

A faithful native port of the web's `.surface` neobrutalist language (see "Surface" in `CONTEXT.md`):

- **Surface** — white card, `rounded-[10px]`, hard 4px offset shadow, **no border**.
- **Buttons (`Btn`)** — square corners, shadow-only; pressing sinks them into their shadow.
- **Chips/Tags** — square, 2px shadow; selected state is `pop-300`.
- **Inputs** — `border-2 border-border` (the only surviving border width).
- Shadows are real CSS `boxShadow` strings (RN 0.76+/new architecture), via the `hardShadow(px)` helper — never per-screen ad-hoc styles.
- Tokens live in `tailwind.config.js`, hex-converted from the web's oklch values: background `#FFEAC7`, shadow `#292524`, `brand` = amber, `pop` = orange. Components use `brand-*`/`pop-*`/semantic names, never raw Tailwind palette names.

## Gotchas (all load-bearing — read before touching deps)

| Gotcha | Rule |
|---|---|
| **`hono` version lockstep** | Mobile pins `hono` **exactly** to the root lockfile's version (4.12.5). Two different hono copies make `ApiRoutes` types refuse to unify. If you bump the server's hono, bump mobile's in the same commit. |
| **`@kinde/js-utils` is patched** | Its `await import("expo-secure-store")` survives Metro untransformed and crashes Hermes ("Invalid expression"). `patches/` rewrites it to `require()` — applied automatically by `bun install`. Re-verify after upgrading the Kinde packages. |
| **`@kinde/js-utils` types are broken** | The published `main.d.ts` is empty, so `src/types/kinde.d.ts` declares `getRawToken` by module augmentation. Delete it if an upgrade fixes their types (you'll get a duplicate-identifier error as the signal). |
| **`overrides` in package.json** | `@kinde/expo` pins SDK-55-era expo modules; the overrides force SDK 57 versions so Expo Go doesn't get mismatched native modules. Revisit on every Expo SDK upgrade. |
| **`types: ["bun"]` in tsconfig** | Server route files (type-checked transitively through `ApiRoutes`) use `Buffer`. Don't remove it. |
| **Expo Go ↔ SDK version** | The project SDK must match the installed Expo Go. Old-iOS phones silently receive old Expo Go builds from the store. |

## Status & roadmap

All five v1 milestones are code-complete (2026-07-05); on-device visual verification is pending.

- **v1.1**: Steam library tab (read-only) + Insights screen; lists (view-only first).
- **Deferred polish**: dark mode (tokens exist web-side; port the `.dark` values), the Bitcount display font (expo-font), library history pagination (needs a zod query validator on `GET /api/game-sessions/user/:userId/history` so `hc` accepts `limit`/`offset`).
- **Distribution**: EAS Build → TestFlight once enrolled in the Apple Developer Program (local iOS builds aren't possible on this project's dev machine); an Android APK via EAS is the free alternative. Before any App Store release: Sign in with Apple is required if Kinde offers Google login.
