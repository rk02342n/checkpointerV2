import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

async function getCurrentlyPlaying(): Promise<CurrentlyPlayingResponse> {
  const res = await api["game-sessions"].current.$get();
  if (!res.ok) throw new Error("Failed to fetch currently playing");
  return res.json() as Promise<CurrentlyPlayingResponse>;
}

export const currentlyPlayingQueryOptions = queryOptions({
  queryKey: ['currently-playing'],
  queryFn: getCurrentlyPlaying,
  staleTime: 1000 * 60,
});

async function getUserCurrentlyPlaying(userId: string): Promise<CurrentlyPlayingResponse> {
  const res = await api["game-sessions"].user[":userId"].$get({ param: { userId } });
  if (!res.ok) throw new Error("Failed to fetch user's currently playing");
  return res.json() as Promise<CurrentlyPlayingResponse>;
}

export const userCurrentlyPlayingQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user-currently-playing', userId],
    queryFn: () => getUserCurrentlyPlaying(userId),
    staleTime: 1000 * 60,
  });

export async function setCurrentlyPlaying(gameId: string): Promise<CurrentlyPlayingResponse> {
  const res = await api["game-sessions"].current.$post({ json: { gameId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to set currently playing");
  }
  return res.json() as Promise<CurrentlyPlayingResponse>;
}

export async function stopPlaying(status?: SessionStatus): Promise<{ session: GameSession }> {
  const res = await api["game-sessions"].current.$delete({ json: { status } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to stop playing");
  }
  return res.json() as Promise<{ session: GameSession }>;
}

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
  if (!res.ok) throw new Error("Failed to fetch play history");
  return res.json();
}

export const playHistoryQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['play-history', userId],
    queryFn: () => getPlayHistory(userId),
    staleTime: 1000 * 60 * 5,
  });

export const playHistoryInfiniteOptions = (userId: string, limit = 20) => ({
  queryKey: ['play-history', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getPlayHistory(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: PlayHistoryResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

export async function logPastGame(gameId: string, status: SessionStatus = "finished"): Promise<CurrentlyPlayingResponse> {
  const res = await api["game-sessions"].history.$post({ json: { gameId, status } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to log past game");
  }
  return res.json() as Promise<CurrentlyPlayingResponse>;
}

async function getGameActivePlayers(gameId: string): Promise<{ count: number }> {
  const res = await api["game-sessions"].game[":gameId"]["active-players"].$get({ param: { gameId } });
  if (!res.ok) throw new Error("Failed to fetch playing count");
  return res.json() as Promise<{ count: number }>;
}

export const gameActivePlayersQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['game-active-players', gameId],
    queryFn: () => getGameActivePlayers(gameId),
    staleTime: 1000 * 30,
  });
