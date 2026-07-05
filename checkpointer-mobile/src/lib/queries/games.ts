import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";

// Response types flow from the server routes via hc<ApiRoutes> — no casts.

export const trendingGamesQueryOptions = queryOptions({
  queryKey: ["trending-games"],
  queryFn: async () => {
    const res = await api.games.trending.$get();
    if (!res.ok) {
      throw new Error("Server error");
    }
    return res.json();
  },
  staleTime: 1000 * 60 * 5,
});

export const topRatedGamesQueryOptions = queryOptions({
  queryKey: ["top-rated-games"],
  queryFn: async () => {
    const res = await api.games["top-rated"].$get();
    if (!res.ok) {
      throw new Error("Server error");
    }
    return res.json();
  },
  staleTime: 1000 * 60 * 5,
});

export const featuredGamesQueryOptions = queryOptions({
  queryKey: ["featured-games"],
  queryFn: async () => {
    const res = await api.games.featured.$get();
    if (!res.ok) {
      throw new Error("Server error");
    }
    return res.json();
  },
  staleTime: 1000 * 60 * 5,
});

export const gameQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["game", id],
    queryFn: async () => {
      const res = await api.games[":id"].$get({ param: { id } });
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Game not found" : "Server error");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

export const searchGamesQueryOptions = (q: string) =>
  queryOptions({
    queryKey: ["search-games", q],
    queryFn: async () => {
      const res = await api.games.search.$get({ query: { q } });
      if (!res.ok) {
        throw new Error("Server error");
      }
      return res.json();
    },
    enabled: q.trim().length > 0,
    staleTime: 1000 * 60,
  });
