# Checkpointer V2: State Management Analysis

## Project Summary

**Checkpointer V2** is a full-stack video game review/tracking application.

| Layer | Technology |
|-------|------------|
| Backend | Bun + Hono + Drizzle ORM + PostgreSQL |
| Frontend | React 19 + Vite + TanStack Router |
| Server State | TanStack React Query |
| Forms | TanStack React Form |
| Styling | Tailwind CSS + Radix UI |
| Auth | Kinde SDK |

**Key Features:** Game browsing/search, review creation with ratings, review likes, user profiles, admin panel, expense tracking.

---

## Current State Management

| Category | Tool | Usage |
|----------|------|-------|
| Server state | React Query | Games, reviews, users, expenses |
| Local UI state | useState | Search inputs, modal toggles |
| Form state | TanStack Form | Review creation form |
| Global client state | **None** | No Redux/Zustand/Jotai |

---

## Pain Points Identified

### 1. Manual Cache Synchronization (HIGH)
**Files:** `routes/games/$gameId.tsx`, `routes/_authenticated/profile.tsx`

Reviews are cached by both game ID and user ID. When creating/deleting a review, both caches must be manually updated:
```tsx
// Must update game reviews cache
queryClient.setQueryData(['get-reviews-game', gameId], ...)
// AND user reviews cache
queryClient.setQueryData(['get-reviews-user', dbUserId], ...)
```

### 2. Auth State Redundancy (MEDIUM)
**Files:** Navbar.tsx, profile.tsx, admin.tsx, $gameId.tsx

Same auth queries called independently in multiple components:
```tsx
const { data: dbUserData } = useQuery(dbUserQueryOptions);
const isAdmin = dbUserData?.account?.role === 'admin';
```

### 3. Duplicated Mutation Patterns (MEDIUM)
**Files:** `$gameId.tsx` (lines 41-84), `profile.tsx` (lines 241-281)

Like/delete mutations with optimistic updates are copy-pasted between files.

### 4. Magic String Query Keys (LOW)
Query keys like `['get-reviews-user', dbUserId]` are string literals prone to typos.

### 5. Monolithic Components (LOW)
`$gameId.tsx` is 600+ lines mixing routing, fetching, mutations, forms, and UI.

---

## Recommendation: Do NOT Add Zustand

### Why Zustand Won't Help

| Pain Point | Would Zustand Help? | Reason |
|------------|---------------------|--------|
| Cache sync | **No** | Server state problem, not client state |
| Auth redundancy | **No** | React Query already caches (staleTime: Infinity) |
| Duplicate mutations | **No** | Code organization, not state management |
| Magic strings | **No** | Needs centralized constants |
| Large components | **No** | Needs component decomposition |

**Key Insight:** This app is **server-state driven**. Users fetch games, view reviews, create reviews - all server operations. There is minimal client-only state that needs to persist across components.

Zustand excels at client-only global state (shopping carts, multi-step wizards, offline drafts). This app doesn't have those patterns.

### What Would Help Instead

Refactor React Query patterns:

1. **Create `lib/queryKeys.ts`** - Centralize all query key definitions
2. **Create `hooks/useAuth.ts`** - Single hook returning user, isAdmin, isAuthenticated
3. **Create `hooks/useReviewMutations.ts`** - Shared mutation hooks with multi-cache updates
4. **Decompose `$gameId.tsx`** - Split into GameHeader, ReviewForm, ReviewsList components

---

## Trade-off Summary

| Approach | Pros | Cons |
|----------|------|------|
| **Add Zustand** | Clean API, tiny bundle (~1KB) | Doesn't solve actual pain points, adds parallel state system |
| **Refactor React Query** | No new deps, directly addresses issues | Requires upfront effort |

---

## When to Reconsider Zustand

Add Zustand later if the app introduces:
- Multi-step game logging wizard with persistent draft state
- Complex filter/sort preferences that persist across sessions
- Offline-first features with local-only state
- Real-time collaboration features

---

## Conclusion

The current TanStack stack (Query + Router + Form) is well-suited for this application. The pain points are solved by **better code organization**, not by adding a new library.

**Recommendation:** Improve developer experience by creating shared hooks and centralizing query keys, rather than introducing Zustand.
