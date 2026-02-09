import { queryOptions } from "@tanstack/react-query";

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
    // await new Promise((r) => setTimeout(r, 5000)) // fake delay to test skeleton
    const res = await fetch("api/games")

    // client will let us use RPC instead - helps make everything typesafe
    // const res = await api.expenses.$get() // not working because of error caused by hono client
    if(!res.ok){
      throw new Error("Ummmm Server error");
    }
    const data = await res.json()
    return data
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

    const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchQuery.trim())}`);

    if (!res.ok) {
      throw new Error(`Server error while searching games: ${res.status}`);
    }

    const data = await res.json();
    return data;
}

export function getSearchGamesQueryOptions(searchQuery: string) {
    return queryOptions({
      queryKey: ['search-games', searchQuery.trim()],
      queryFn: () => searchGames(searchQuery),
      enabled: searchQuery.trim().length > 0,
      staleTime: 1000 * 30, // Cache for 30 seconds
    });
  }

  export async function getGameById(id: string) {
    // await new Promise((r) => setTimeout(r, 2000)) // to test skeleton TBD
    const res = await fetch(`/api/games/${id}`)
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Game not found");
      }
      throw new Error("Server error");
    }
    const data = await res.json()
    return data as {
      game: Game & { summary?: string; slug?: string };
      genres: Genre[];
      platforms: Platform[];
      keywords: Keyword[];
      images: GameImage[];
      links: GameLink[];
    }
  }

  export const getGameByIdQueryOptions = (id: string) => queryOptions({
    queryKey: ['get-game', id],
    queryFn: () => getGameById(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id // Only run query if id exists
  })

  export async function getGameRating (id: string) {
    // await new Promise((r) => setTimeout(r, 3000)) // to test skeleton TBD
    const res = await fetch(`/api/games/rating/${id}`)
    if(!res.ok){
      throw new Error("Server error");
    }
    const data = await res.json()
    return data
}

export async function getTopRatedGames(limit = 4): Promise<{ games: Game[] }> {
  const res = await fetch(`/api/games/top-rated?limit=${limit}`);
  if (!res.ok) {
    throw new Error("Server error fetching top rated games");
  }
  return res.json();
}

export const getTopRatedGamesQueryOptions = queryOptions({
  queryKey: ["top-rated-games"],
  queryFn: () => getTopRatedGames(),
  staleTime: 1000 * 60 * 5,
});

export async function getTrendingGames(limit = 4): Promise<{ games: Game[] }> {
  const res = await fetch(`/api/games/trending?limit=${limit}`);
  if (!res.ok) {
    throw new Error("Server error fetching trending games");
  }
  return res.json();
}

export const getTrendingGamesQueryOptions = queryOptions({
  queryKey: ["trending-games"],
  queryFn: () => getTrendingGames(),
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
  years: string[]
  genres: Genre[]
  platforms: Platform[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export async function browseGames(params: BrowseGamesParams = {}): Promise<BrowseGamesResponse> {
  const searchParams = new URLSearchParams()

  if (params.q) searchParams.set('q', params.q)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  if (params.year) searchParams.set('year', params.year)
  if (params.genre) searchParams.set('genre', params.genre)
  if (params.platform) searchParams.set('platform', params.platform)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const res = await fetch(`/api/games/browse?${searchParams.toString()}`)

  if (!res.ok) {
    throw new Error(`Server error while browsing games: ${res.status}`)
  }

  return res.json()
}

export function getBrowseGamesQueryOptions(params: BrowseGamesParams = {}) {
  return queryOptions({
    queryKey: ['browse-games', params],
    queryFn: () => browseGames(params),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  })
}
