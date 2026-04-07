import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GamePlatform {
  id: string;
  name: string;
  slug: string;
  abbreviation?: string | null;
}

export interface Game {
  id: string | number;
  name: string;
  coverUrl: string | null;
  releaseDate: string | Date | null;
  igdbRating?: string | null;
  platforms?: GamePlatform[];
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Platform {
  id: string;
  name: string;
  slug: string;
  abbreviation?: string | null;
}

export interface Keyword {
  id: string;
  name: string;
  slug: string;
}

export interface GameImage {
  id: string;
  gameId: string;
  igdbImageId: string | null;
  imageType: "screenshot" | "artwork" | "cover";
  url: string;
  width: number | null;
  height: number | null;
  position: number;
}

export interface GameLink {
  id: string;
  gameId: string;
  category: "official" | "steam" | "gog" | "epic" | "itch" | "wikipedia" | "twitter" | "reddit" | "youtube" | "twitch" | "discord" | "other";
  url: string;
  label: string | null;
}

export async function getAllGames() {
  const res = await api.games.$get();
  if(!res.ok) throw new Error("Server error");
  return res.json();
}

export const getAllGamesQueryOptions = queryOptions({
  queryKey: ['get-all-games'],
  queryFn: getAllGames,
  staleTime: 1000 * 60 * 5
})

export async function searchGames(searchQuery: string): Promise<{ games: Game[] }> {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return { games: [] };
  }
  const res = await api.games.search.$get({ query: { q: searchQuery.trim() } });
  if (!res.ok) throw new Error(`Server error while searching games: ${res.status}`);
  return res.json() as Promise<{ games: Game[] }>;
}

export function getSearchGamesQueryOptions(searchQuery: string) {
  return queryOptions({
    queryKey: ['search-games', searchQuery.trim()],
    queryFn: () => searchGames(searchQuery),
    enabled: searchQuery.trim().length > 0,
    staleTime: 1000 * 30,
  });
}

export async function getGameById(id: string) {
  const res = await api.games[":id"].$get({ param: { id } });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Game not found");
    throw new Error("Server error");
  }
  return res.json() as Promise<{
    game: Game & { summary?: string; slug?: string };
    genres: Genre[];
    platforms: Platform[];
    keywords: Keyword[];
    images: GameImage[];
    links: GameLink[];
  }>;
}

export const getGameByIdQueryOptions = (id: string) => queryOptions({
  queryKey: ['get-game', id],
  queryFn: () => getGameById(id),
  staleTime: 1000 * 60 * 5,
  enabled: !!id
})

export async function getGameRating(id: string) {
  const res = await api.games.rating[":id"].$get({ param: { id } });
  if (!res.ok) throw new Error("Server error");
  return res.json();
}

export async function getFeaturedGames(): Promise<{ games: Game[] }> {
  const res = await api.games.featured.$get();
  if (!res.ok) throw new Error("Server error fetching featured games");
  return res.json() as Promise<{ games: Game[] }>;
}

export const getFeaturedGamesQueryOptions = queryOptions({
  queryKey: ["featured-games"],
  queryFn: getFeaturedGames,
  staleTime: 1000 * 60 * 5,
});

export async function getTopRatedGames(limit = 4): Promise<{ games: Game[] }> {
  const res = await api.games["top-rated"].$get({ query: { limit: String(limit) } });
  if (!res.ok) throw new Error("Server error fetching top rated games");
  return res.json() as Promise<{ games: Game[] }>;
}

export const getTopRatedGamesQueryOptions = queryOptions({
  queryKey: ["top-rated-games"],
  queryFn: () => getTopRatedGames(6),
  staleTime: 1000 * 60 * 5,
});

export async function getTrendingGames(limit = 4): Promise<{ games: Game[] }> {
  const res = await api.games.trending.$get({ query: { limit: String(limit) } });
  if (!res.ok) throw new Error("Server error fetching trending games");
  return res.json() as Promise<{ games: Game[] }>;
}

export const getTrendingGamesQueryOptions = queryOptions({
  queryKey: ["trending-games"],
  queryFn: () => getTrendingGames(6),
  staleTime: 1000 * 60 * 5,
});

export interface BrowseGamesParams {
  q?: string
  sortBy?: 'rating' | 'year' | 'name'
  sortOrder?: 'asc' | 'desc'
  year?: string
  genre?: string
  platform?: string
  limit?: number
  offset?: number
}

export interface BrowseGamesResponse {
  games: Game[]
  totalCount: number
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export async function browseGames(params: BrowseGamesParams = {}): Promise<BrowseGamesResponse> {
  const query: Record<string, string> = {};
  if (params.q) query.q = params.q;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  if (params.year) query.year = params.year;
  if (params.genre) query.genre = params.genre;
  if (params.platform) query.platform = params.platform;
  if (params.limit) query.limit = String(params.limit);
  if (params.offset) query.offset = String(params.offset);

  const res = await api.games.browse.$get({ query });
  if (!res.ok) throw new Error(`Server error while browsing games: ${res.status}`);
  return res.json() as Promise<BrowseGamesResponse>;
}

export function getBrowseGamesQueryOptions(params: BrowseGamesParams = {}) {
  return queryOptions({
    queryKey: ['browse-games', params],
    queryFn: () => browseGames(params),
    staleTime: 1000 * 60 * 2,
  })
}

export async function fetchBrowseFilters(): Promise<{ years: string[]; genres: Genre[]; platforms: Platform[] }> {
  const res = await api.games["browse-filters"].$get();
  if (!res.ok) throw new Error(`Server error fetching browse filters: ${res.status}`);
  return res.json() as Promise<{ years: string[]; genres: Genre[]; platforms: Platform[] }>;
}

export const getBrowseFiltersQueryOptions = queryOptions({
  queryKey: ['browse-filters'],
  queryFn: fetchBrowseFilters,
  staleTime: 1000 * 60 * 10,
});
