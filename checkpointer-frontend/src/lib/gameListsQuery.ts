import { queryOptions } from "@tanstack/react-query";

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

// Get own lists
async function getMyGameLists(): Promise<{ lists: GameListSummary[] }> {
  const res = await fetch("/api/game-lists");
  if (!res.ok) {
    throw new Error("Failed to fetch game lists");
  }
  return res.json();
}

export const myGameListsQueryOptions = queryOptions({
  queryKey: ['my-game-lists'],
  queryFn: getMyGameLists,
  staleTime: 1000 * 60 * 5, // 5 minutes
});

// Get user's public lists
async function getUserGameLists(userId: string): Promise<{ lists: GameListSummary[] }> {
  const res = await fetch(`/api/game-lists/user/${userId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user's game lists");
  }
  return res.json();
}

export const userGameListsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user-game-lists', userId],
    queryFn: () => getUserGameLists(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

// Get single list with games (public)
async function getGameList(listId: string): Promise<{ list: GameListDetail }> {
  const res = await fetch(`/api/game-lists/${listId}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("List not found");
    }
    throw new Error("Failed to fetch game list");
  }
  return res.json();
}

export const gameListQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: ['game-list', listId],
    queryFn: () => getGameList(listId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

// Get single list with games (authenticated, includes private)
async function getGameListAuth(listId: string): Promise<{ list: GameListDetail }> {
  const res = await fetch(`/api/game-lists/${listId}/auth`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("List not found");
    }
    throw new Error("Failed to fetch game list");
  }
  return res.json();
}

export const gameListAuthQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: ['game-list-auth', listId],
    queryFn: () => getGameListAuth(listId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

// Get own lists with game inclusion status (for AddToList modal)
async function getListsForGame(gameId: string): Promise<{ lists: GameListWithStatus[] }> {
  const res = await fetch(`/api/game-lists/game/${gameId}/lists`);
  if (!res.ok) {
    throw new Error("Failed to fetch lists for game");
  }
  return res.json();
}

export const listsForGameQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['lists-for-game', gameId],
    queryFn: () => getListsForGame(gameId),
    staleTime: 1000 * 60, // 1 minute
  });

// Create a new list
export async function createList(data: {
  name: string;
  description?: string;
  visibility?: GameListVisibility;
}): Promise<{ list: GameListSummary }> {
  const res = await fetch("/api/game-lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create list");
  }
  return res.json();
}

// Update a list
export async function updateList(
  listId: string,
  data: {
    name?: string;
    description?: string;
    visibility?: GameListVisibility;
  }
): Promise<{ list: GameListSummary }> {
  const res = await fetch(`/api/game-lists/${listId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update list");
  }
  return res.json();
}

// Delete a list
export async function deleteList(listId: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete list");
  }
  return res.json();
}

// Add game to list
export async function addGameToList(
  listId: string,
  gameId: string
): Promise<{ added: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}/games/${gameId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add game to list");
  }
  return res.json();
}

// Remove game from list
export async function removeGameFromList(
  listId: string,
  gameId: string
): Promise<{ removed: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}/games/${gameId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove game from list");
  }
  return res.json();
}

// Reorder games in list
export async function reorderListGames(
  listId: string,
  gameIds: string[]
): Promise<{ reordered: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reorder games");
  }
  return res.json();
}

// Upload cover image for list
export async function uploadListCover(
  listId: string,
  file: File
): Promise<{ coverUrl: string; key: string }> {
  const formData = new FormData();
  formData.append("cover", file);

  const res = await fetch(`/api/game-lists/${listId}/cover`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to upload cover");
  }
  return res.json();
}

// Remove cover image from list
export async function removeListCover(
  listId: string
): Promise<{ removed: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}/cover`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove cover");
  }
  return res.json();
}

// Get cover URL for a list
export function getListCoverUrl(listId: string): string {
  return `/api/game-lists/${listId}/cover`;
}

// Get saved lists
async function getMySavedLists(): Promise<{ lists: SavedGameListSummary[] }> {
  const res = await fetch("/api/game-lists/saved");
  if (!res.ok) {
    throw new Error("Failed to fetch saved lists");
  }
  return res.json();
}

export const mySavedListsQueryOptions = queryOptions({
  queryKey: ['my-saved-lists'],
  queryFn: getMySavedLists,
  staleTime: 1000 * 60 * 5, // 5 minutes
});

// Check if a list is saved
async function getListSaved(listId: string): Promise<{ isSaved: boolean; saveCount: number }> {
  const res = await fetch(`/api/game-lists/${listId}/save`);
  if (!res.ok) {
    throw new Error("Failed to check list saved status");
  }
  return res.json();
}

export const listSavedQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: ['list-saved', listId],
    queryFn: () => getListSaved(listId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

// Save a list
export async function saveList(listId: string): Promise<{ saved: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}/save`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to save list");
  }
  return res.json();
}

// Unsave a list
export async function unsaveList(listId: string): Promise<{ unsaved: boolean }> {
  const res = await fetch(`/api/game-lists/${listId}/save`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to unsave list");
  }
  return res.json();
}
