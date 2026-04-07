import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type GameListVisibility = "public" | "private";

export type GameListSummary = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: GameListVisibility;
  createdAt: string;
  updatedAt: string;
  gameCount: number;
  gameCoverUrls: (string | null)[];
};

export type GameListGame = {
  gameId: string;
  position: number;
  addedAt: string;
  gameName: string;
  gameCoverUrl: string | null;
  gameSlug: string | null;
  gameReleaseDate: string | null;
};

export type GameListDetail = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: GameListVisibility;
  createdAt: string;
  updatedAt: string;
  ownerUsername: string;
  ownerDisplayName: string | null;
  ownerAvatarUrl: string | null;
  games: GameListGame[];
  gameCount: number;
  isOwner?: boolean;
};

export type GameListWithStatus = {
  id: string;
  name: string;
  visibility: GameListVisibility;
  gameCount: number;
  hasGame: boolean;
};

export type SavedGameListSummary = GameListSummary & {
  ownerUsername: string;
  ownerDisplayName: string | null;
  ownerAvatarUrl: string | null;
  ownerId: string;
};

export type PopularGameListSummary = GameListSummary & {
  ownerUsername: string;
  ownerDisplayName: string | null;
  ownerAvatarUrl: string | null;
  ownerId: string;
  saveCount: number;
};

export type PaginatedGameListsResponse = {
  lists: GameListSummary[];
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
};

export type PaginatedSavedGameListsResponse = {
  lists: SavedGameListSummary[];
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
};

export async function searchGameLists(searchQuery: string): Promise<{ lists: GameListSummary[] }> {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return { lists: [] };
  }
  const res = await fetch(`/api/game-lists/search?q=${encodeURIComponent(searchQuery.trim())}`);
  if (!res.ok) throw new Error(`Server error while searching lists: ${res.status}`);
  return res.json();
}

export function getSearchGameListsQueryOptions(searchQuery: string) {
  return queryOptions({
    queryKey: ['search-game-lists', searchQuery.trim()],
    queryFn: () => searchGameLists(searchQuery),
    enabled: searchQuery.trim().length > 0,
    staleTime: 1000 * 30,
  });
}

async function getMyGameLists(offset = 0, limit = 20): Promise<PaginatedGameListsResponse> {
  const res = await api["game-lists"].$get({ query: { offset: String(offset), limit: String(limit) } });
  if (!res.ok) throw new Error("Failed to fetch game lists");
  return res.json() as Promise<PaginatedGameListsResponse>;
}

export const myGameListsQueryOptions = queryOptions({
  queryKey: ['my-game-lists'],
  queryFn: () => getMyGameLists(),
  staleTime: 1000 * 60 * 5,
});

export const myGameListsInfiniteOptions = (limit = 20) => ({
  queryKey: ['my-game-lists'],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getMyGameLists(pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: PaginatedGameListsResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

async function getUserGameLists(userId: string, offset = 0, limit = 20): Promise<PaginatedGameListsResponse> {
  const res = await fetch(`/api/game-lists/user/${userId}?offset=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch user's game lists");
  return res.json();
}

export const userGameListsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user-game-lists', userId],
    queryFn: () => getUserGameLists(userId),
    staleTime: 1000 * 60 * 5,
  });

export const userGameListsInfiniteOptions = (userId: string, limit = 20) => ({
  queryKey: ['user-game-lists', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getUserGameLists(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: PaginatedGameListsResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

async function getGameList(listId: string): Promise<{ list: GameListDetail }> {
  const res = await api["game-lists"][":listId"].$get({ param: { listId } });
  if (!res.ok) {
    if (res.status === 404) throw new Error("List not found");
    throw new Error("Failed to fetch game list");
  }
  return res.json() as Promise<{ list: GameListDetail }>;
}

export const gameListQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: ['game-list', listId],
    queryFn: () => getGameList(listId),
    staleTime: 1000 * 60 * 2,
  });

async function getGameListAuth(listId: string): Promise<{ list: GameListDetail }> {
  const res = await api["game-lists"][":listId"].auth.$get({ param: { listId } });
  if (!res.ok) {
    if (res.status === 404) throw new Error("List not found");
    throw new Error("Failed to fetch game list");
  }
  return res.json() as Promise<{ list: GameListDetail }>;
}

export const gameListAuthQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: ['game-list-auth', listId],
    queryFn: () => getGameListAuth(listId),
    staleTime: 1000 * 60 * 2,
  });

async function getListsForGame(gameId: string): Promise<{ lists: GameListWithStatus[] }> {
  const res = await api["game-lists"].game[":gameId"].lists.$get({ param: { gameId } });
  if (!res.ok) throw new Error("Failed to fetch lists for game");
  return res.json() as Promise<{ lists: GameListWithStatus[] }>;
}

export const listsForGameQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['lists-for-game', gameId],
    queryFn: () => getListsForGame(gameId),
    staleTime: 1000 * 60,
  });

export async function createList(data: {
  name: string;
  description?: string;
  visibility?: GameListVisibility;
}): Promise<{ list: GameListSummary }> {
  const res = await api["game-lists"].$post({ json: data });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to create list");
  }
  return res.json() as unknown as Promise<{ list: GameListSummary }>;
}

export async function updateList(
  listId: string,
  data: { name?: string; description?: string; visibility?: GameListVisibility }
): Promise<{ list: GameListSummary }> {
  const res = await api["game-lists"][":listId"].$patch({ param: { listId }, json: data });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to update list");
  }
  return res.json() as unknown as Promise<{ list: GameListSummary }>;
}

export async function deleteList(listId: string): Promise<{ deleted: boolean }> {
  const res = await api["game-lists"][":listId"].$delete({ param: { listId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to delete list");
  }
  return res.json() as Promise<{ deleted: boolean }>;
}

export async function addGameToList(listId: string, gameId: string): Promise<{ added: boolean }> {
  const res = await api["game-lists"][":listId"].games[":gameId"].$post({ param: { listId, gameId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to add game to list");
  }
  return res.json() as Promise<{ added: boolean }>;
}

export async function removeGameFromList(listId: string, gameId: string): Promise<{ removed: boolean }> {
  const res = await api["game-lists"][":listId"].games[":gameId"].$delete({ param: { listId, gameId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to remove game from list");
  }
  return res.json() as Promise<{ removed: boolean }>;
}

export async function reorderListGames(listId: string, gameIds: string[]): Promise<{ reordered: boolean }> {
  const res = await api["game-lists"][":listId"].reorder.$patch({ param: { listId }, json: { gameIds } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to reorder games");
  }
  return res.json() as Promise<{ reordered: boolean }>;
}

// FormData upload — not supported by the Hono RPC client
export async function uploadListCover(listId: string, file: File): Promise<{ coverUrl: string; key: string }> {
  const formData = new FormData();
  formData.append("cover", file);
  const res = await fetch(`/api/game-lists/${listId}/cover`, { method: "POST", body: formData });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to upload cover");
  }
  return res.json();
}

export async function removeListCover(listId: string): Promise<{ removed: boolean }> {
  const res = await api["game-lists"][":listId"].cover.$delete({ param: { listId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to remove cover");
  }
  return res.json() as Promise<{ removed: boolean }>;
}

export function getListCoverUrl(listId: string): string {
  return `/api/game-lists/${listId}/cover`;
}

async function getMySavedLists(offset = 0, limit = 20): Promise<PaginatedSavedGameListsResponse> {
  const res = await api["game-lists"].saved.$get({ query: { offset: String(offset), limit: String(limit) } });
  if (!res.ok) throw new Error("Failed to fetch saved lists");
  return res.json() as Promise<PaginatedSavedGameListsResponse>;
}

export const mySavedListsQueryOptions = queryOptions({
  queryKey: ['my-saved-lists'],
  queryFn: () => getMySavedLists(),
  staleTime: 1000 * 60 * 5,
});

export const mySavedListsInfiniteOptions = (limit = 20) => ({
  queryKey: ['my-saved-lists'],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getMySavedLists(pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: PaginatedSavedGameListsResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

async function getPopularLists(limit = 6): Promise<{ lists: PopularGameListSummary[] }> {
  const res = await api["game-lists"].popular.$get({ query: { limit: String(limit) } });
  if (!res.ok) throw new Error("Failed to fetch popular lists");
  return res.json() as Promise<{ lists: PopularGameListSummary[] }>;
}

export const popularListsQueryOptions = queryOptions({
  queryKey: ['popular-lists'],
  queryFn: () => getPopularLists(),
  staleTime: 1000 * 60 * 5,
});

async function getPublicListsForGame(gameId: string, limit = 4): Promise<{ lists: PopularGameListSummary[]; totalCount: number }> {
  const res = await fetch(`/api/game-lists/game/${gameId}/public-lists?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch public lists for game");
  return res.json();
}

export const publicListsForGameQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['public-lists-for-game', gameId],
    queryFn: () => getPublicListsForGame(gameId),
    staleTime: 1000 * 60 * 5,
  });

async function getListSaved(listId: string): Promise<{ isSaved: boolean; saveCount: number }> {
  const res = await api["game-lists"][":listId"].save.$get({ param: { listId } });
  if (!res.ok) throw new Error("Failed to check list saved status");
  return res.json() as Promise<{ isSaved: boolean; saveCount: number }>;
}

export const listSavedQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: ['list-saved', listId],
    queryFn: () => getListSaved(listId),
    staleTime: 1000 * 60 * 2,
  });

export async function saveList(listId: string): Promise<{ saved: boolean }> {
  const res = await api["game-lists"][":listId"].save.$post({ param: { listId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to save list");
  }
  return res.json() as Promise<{ saved: boolean }>;
}

export async function unsaveList(listId: string): Promise<{ unsaved: boolean }> {
  const res = await api["game-lists"][":listId"].save.$delete({ param: { listId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to unsave list");
  }
  return res.json() as Promise<{ unsaved: boolean }>;
}
