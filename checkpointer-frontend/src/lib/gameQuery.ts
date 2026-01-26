import { queryOptions } from "@tanstack/react-query";

export interface Game {
  id: string | number;
  name: string;
  coverUrl: string | null;
  releaseDate: string | Date | null;
  igdbRating?: string | null;
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

  export async function getGameById(id: string) {
    // await new Promise((r) => setTimeout(r, 4000)) // to test skeleton TBD
    const res = await fetch(`/api/games/${id}`)
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Game not found");
      }
      throw new Error("Server error");
    }
    const data = await res.json()
    return data
  }
  
  export const getGameByIdQueryOptions = (id: string) => queryOptions({
    queryKey: ['get-game', id], 
    queryFn: () => getGameById(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id // Only run query if id exists
  })

  export async function getGameRating (id: string) {
    //await new Promise((r) => setTimeout(r, 3000)) // to test skeleton TBD
    const res = await fetch(`/api/games/rating/${id}`)
    if(!res.ok){
      throw new Error("Server error");
    }
    const data = await res.json()
    return data
}
