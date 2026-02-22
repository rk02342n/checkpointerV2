import { queryOptions } from "@tanstack/react-query";

export type SessionStatus = "finished" | "stashed";

export type GameSession = {
  id: string;
  userId: string;
  gameId: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus | null;
};

export type GameSessionGame = {
  id: string;
  name: string;
  coverUrl: string | null;
};

export type CurrentlyPlayingResponse = {
  session: GameSession | null;
  game: GameSessionGame | null;
};

// Get own currently playing session
async function getCurrentlyPlaying(): Promise<CurrentlyPlayingResponse> {
  const res = await fetch("/api/game-sessions/current");
  if (!res.ok) {
    throw new Error("Failed to fetch currently playing");
  }
  return res.json();
}

export const currentlyPlayingQueryOptions = queryOptions({
  queryKey: ['currently-playing'],
  queryFn: getCurrentlyPlaying,
  staleTime: 1000 * 60, // 1 minute
});

// Get any user's currently playing session (public)
async function getUserCurrentlyPlaying(userId: string): Promise<CurrentlyPlayingResponse> {
  const res = await fetch(`/api/game-sessions/user/${userId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user's currently playing");
  }
  return res.json();
}

export const userCurrentlyPlayingQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user-currently-playing', userId],
    queryFn: () => getUserCurrentlyPlaying(userId),
    staleTime: 1000 * 60, // 1 minute
  });

// Set currently playing game
export async function setCurrentlyPlaying(gameId: string): Promise<CurrentlyPlayingResponse> {
  const res = await fetch("/api/game-sessions/current", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to set currently playing");
  }
  return res.json();
}

// Stop playing (end current session)
export async function stopPlaying(status?: SessionStatus): Promise<{ session: GameSession }> {
  const res = await fetch("/api/game-sessions/current", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to stop playing");
  }
  return res.json();
}

// Get user's play history
export type PlayHistoryResponse = {
  sessions: Array<{
    session: GameSession;
    game: GameSessionGame;
  }>;
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
};

async function getPlayHistory(userId: string, offset = 0, limit = 20): Promise<PlayHistoryResponse> {
  const res = await fetch(`/api/game-sessions/user/${userId}/history?offset=${offset}&limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to fetch play history");
  }
  return res.json();
}

export const playHistoryQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['play-history', userId],
    queryFn: () => getPlayHistory(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const playHistoryInfiniteOptions = (userId: string, limit: number = 20) => ({
  queryKey: ['play-history', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getPlayHistory(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: PlayHistoryResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

// Log a past game (creates an already-completed session)
export async function logPastGame(gameId: string, status: SessionStatus = "finished"): Promise<CurrentlyPlayingResponse> {
  const res = await fetch("/api/game-sessions/history", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId, status }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to log past game");
  }
  return res.json();
}

// Get count of users currently playing a game
async function getGameActivePlayers(gameId: string): Promise<{ count: number }> {
  const res = await fetch(`/api/game-sessions/game/${gameId}/active-players`);
  if (!res.ok) {
    throw new Error("Failed to fetch playing count");
  }
  return res.json();
}

export const gameActivePlayersQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['game-active-players', gameId],
    queryFn: () => getGameActivePlayers(gameId),
    staleTime: 1000 * 30, // 30 seconds - refresh more frequently for live count
  });
