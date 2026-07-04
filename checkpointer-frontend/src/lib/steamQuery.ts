import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type SteamSyncStatus = "pending" | "ok" | "private_profile" | "error";

export type SteamStatus =
  | { connected: false }
  | {
      connected: true;
      steamId64: string;
      personaName: string | null;
      avatarUrl: string | null;
      profileUrl: string | null;
      syncStatus: SteamSyncStatus;
      lastSyncedAt: string | null;
      nextSyncAvailableAt: string | null;
      totalGames: number;
      matchedGames: number;
      unmatchedGames: number;
      totalPlaytimeMin: number;
      wishlistPendingCount: number;
    };

export type SteamSummary =
  | { connected: false }
  | {
      connected: true;
      personaName: string | null;
      profileUrl: string | null;
      lastSyncedAt: string | null;
      totalGames: number;
      matchedGames: number;
      unmatchedGames: number;
      totalPlaytimeMin: number;
    };

export type SteamLibraryItem = {
  steamAppId: number;
  playtimeForeverMin: number;
  playtime2WeeksMin: number;
  lastPlayedAt: string | null;
  gameId: string;
  gameName: string;
  gameCoverUrl: string | null;
  gameSlug: string | null;
};

export type SteamLibraryResponse = {
  library: SteamLibraryItem[];
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
};

export type SteamUnmatchedItem = {
  steamAppId: number;
  name: string;
  playtimeForeverMin: number;
};

/** POST /sync queues the work on the server; completion arrives via status polling. */
export type SteamSyncQueued = { queued: true };

export type SteamWishlistPendingItem = {
  steamAppId: number;
  gameId: string | null;
  addedAt: string | null;
  gameName: string;
  gameCoverUrl: string | null;
  gameSlug: string | null;
};

async function getSteamStatus(): Promise<SteamStatus> {
  const res = await api.steam.status.$get();
  if (!res.ok) throw new Error("Failed to fetch Steam status");
  return res.json() as Promise<SteamStatus>;
}

export const steamStatusQueryOptions = queryOptions({
  queryKey: ["steam-status"],
  queryFn: getSteamStatus,
  staleTime: 1000 * 60,
  // While a sync job is queued/running on the worker, poll until it settles.
  refetchInterval: (query) =>
    query.state.data?.connected && query.state.data.syncStatus === "pending" ? 2500 : false,
});

export async function syncSteam(): Promise<SteamSyncQueued> {
  const res = await api.steam.sync.$post();
  if (!res.ok) {
    const error = (await res.json()) as { error?: string; retryAfterMs?: number };
    if (res.status === 429 && error.retryAfterMs) {
      const minutes = Math.ceil(error.retryAfterMs / 60000);
      throw new Error(`Synced recently — try again in ${minutes} min`);
    }
    throw new Error(error.error || "Failed to sync with Steam");
  }
  return res.json() as Promise<SteamSyncQueued>;
}

export async function disconnectSteam(): Promise<{ disconnected: boolean }> {
  const res = await api.steam.connection.$delete();
  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    throw new Error(error.error || "Failed to disconnect Steam");
  }
  return res.json() as Promise<{ disconnected: boolean }>;
}

async function getSteamSummary(userId: string): Promise<SteamSummary> {
  const res = await api.steam.user[":userId"].summary.$get({ param: { userId } });
  if (!res.ok) throw new Error("Failed to fetch Steam summary");
  return res.json() as Promise<SteamSummary>;
}

export const steamSummaryQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["steam-summary", userId],
    queryFn: () => getSteamSummary(userId),
    staleTime: 1000 * 60 * 5,
  });

async function getSteamLibrary(userId: string, offset = 0, limit = 24): Promise<SteamLibraryResponse> {
  const res = await api.steam.user[":userId"].library.$get({
    param: { userId },
    query: { offset: String(offset), limit: String(limit) },
  });
  if (!res.ok) throw new Error("Failed to fetch Steam library");
  return res.json() as Promise<SteamLibraryResponse>;
}

export const steamLibraryInfiniteOptions = (userId: string, limit = 24) => ({
  queryKey: ["steam-library", userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getSteamLibrary(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: SteamLibraryResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

async function getSteamUnmatched(userId: string): Promise<{ items: SteamUnmatchedItem[] }> {
  const res = await api.steam.user[":userId"].unmatched.$get({ param: { userId } });
  if (!res.ok) throw new Error("Failed to fetch unmatched Steam games");
  return res.json() as Promise<{ items: SteamUnmatchedItem[] }>;
}

export const steamUnmatchedQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["steam-unmatched", userId],
    queryFn: () => getSteamUnmatched(userId),
    staleTime: 1000 * 60 * 5,
  });

async function getSteamWishlistPending(): Promise<{ items: SteamWishlistPendingItem[] }> {
  const res = await api.steam.wishlist.pending.$get();
  if (!res.ok) throw new Error("Failed to fetch pending Steam wishlist");
  return res.json() as Promise<{ items: SteamWishlistPendingItem[] }>;
}

export const steamWishlistPendingQueryOptions = queryOptions({
  queryKey: ["steam-wishlist-pending"],
  queryFn: getSteamWishlistPending,
  staleTime: 1000 * 60,
});

export async function importSteamWishlist(steamAppIds: number[]): Promise<{ imported: number }> {
  const res = await api.steam.wishlist.import.$post({ json: { steamAppIds } });
  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    throw new Error(error.error || "Failed to import Steam wishlist");
  }
  return res.json() as Promise<{ imported: number }>;
}

async function getGameSteamPlaytime(gameId: string): Promise<{ playtime: { playtimeForeverMin: number; lastPlayedAt: string | null } | null }> {
  const res = await api.steam.game[":gameId"].playtime.$get({ param: { gameId } });
  if (!res.ok) throw new Error("Failed to fetch Steam playtime");
  return res.json() as Promise<{ playtime: { playtimeForeverMin: number; lastPlayedAt: string | null } | null }>;
}

export const gameSteamPlaytimeQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ["steam-playtime", gameId],
    queryFn: () => getGameSteamPlaytime(gameId),
    staleTime: 1000 * 60 * 5,
  });

/** "473h", "2.5h", "<1h" */
export function formatPlaytime(minutes: number): string {
  if (minutes < 60) return "<1h";
  const hours = minutes / 60;
  return hours >= 10 ? `${Math.round(hours)}h` : `${(Math.round(hours * 10) / 10)}h`;
}
