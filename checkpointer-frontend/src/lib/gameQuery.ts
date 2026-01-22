import { queryOptions } from "@tanstack/react-query";

export interface Game {
  id: string | number;
  name: string;
  coverUrl: string | null;
  releaseDate: string | Date | null;
}

export async function getAllGames() {
    // await new Promise((r) => setTimeout(r, 2000)) // fake delay to test skeleton
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
