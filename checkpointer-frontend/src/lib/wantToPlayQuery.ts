import { queryOptions } from "@tanstack/react-query";

export type WishlistItem = {
  gameId: string;
  createdAt: string;
  gameName: string;
  gameCoverUrl: string | null;
  gameSlug: string | null;
};

export type WishlistResponse = {
  wishlist: WishlistItem[];
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
};

// Get own wishlist
async function getWishlist(offset = 0, limit = 20): Promise<WishlistResponse> {
  const res = await fetch(`/api/want-to-play?offset=${offset}&limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to fetch wishlist");
  }
  return res.json();
}

export const wantToPlayQueryOptions = queryOptions({
  queryKey: ['want-to-play'],
  queryFn: () => getWishlist(),
  staleTime: 1000 * 60 * 5, // 5 minutes
});

export const wishlistInfiniteOptions = (limit: number = 20) => ({
  queryKey: ['want-to-play'],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getWishlist(pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: WishlistResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

// Get any user's wishlist (public)
async function getUserWishlist(userId: string, offset = 0, limit = 20): Promise<WishlistResponse> {
  const res = await fetch(`/api/want-to-play/user/${userId}?offset=${offset}&limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user wishlist");
  }
  return res.json();
}

export const userWantToPlayQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user-want-to-play', userId],
    queryFn: () => getUserWishlist(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const userWishlistInfiniteOptions = (userId: string, limit: number = 20) => ({
  queryKey: ['user-want-to-play', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getUserWishlist(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: WishlistResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

// Check if game is in wishlist
async function checkGameInWishlist(gameId: string): Promise<{ inWishlist: boolean }> {
  const res = await fetch(`/api/want-to-play/check/${gameId}`);
  if (!res.ok) {
    throw new Error("Failed to check wishlist status");
  }
  return res.json();
}

export const gameInWishlistQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['want-to-play-check', gameId],
    queryFn: () => checkGameInWishlist(gameId),
    staleTime: 1000 * 60, // 1 minute
  });

// Get count of users who want to play a game
async function getWantToPlayCount(gameId: string): Promise<{ count: number }> {
  const res = await fetch(`/api/want-to-play/game/${gameId}/count`);
  if (!res.ok) {
    throw new Error("Failed to fetch want to play count");
  }
  return res.json();
}

export const gameWantToPlayCountQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['want-to-play-count', gameId],
    queryFn: () => getWantToPlayCount(gameId),
    staleTime: 1000 * 30, // 30 seconds
  });

// Add game to wishlist
export async function addToWishlist(gameId: string): Promise<{ added: boolean }> {
  const res = await fetch(`/api/want-to-play/${gameId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add to wishlist");
  }
  return res.json();
}

// Remove game from wishlist
export async function removeFromWishlist(gameId: string): Promise<{ removed: boolean }> {
  const res = await fetch(`/api/want-to-play/${gameId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove from wishlist");
  }
  return res.json();
}
