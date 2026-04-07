import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

async function getWishlist(offset = 0, limit = 20): Promise<WishlistResponse> {
  const res = await api["want-to-play"].$get({ query: { offset: String(offset), limit: String(limit) } });
  if (!res.ok) throw new Error("Failed to fetch wishlist");
  return res.json() as Promise<WishlistResponse>;
}

export const wantToPlayQueryOptions = queryOptions({
  queryKey: ['want-to-play'],
  queryFn: () => getWishlist(),
  staleTime: 1000 * 60 * 5,
});

export const wishlistInfiniteOptions = (limit = 20) => ({
  queryKey: ['want-to-play'],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getWishlist(pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: WishlistResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

async function getUserWishlist(userId: string, offset = 0, limit = 20): Promise<WishlistResponse> {
  const res = await fetch(`/api/want-to-play/user/${userId}?offset=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch user wishlist");
  return res.json();
}

export const userWantToPlayQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user-want-to-play', userId],
    queryFn: () => getUserWishlist(userId),
    staleTime: 1000 * 60 * 5,
  });

export const userWishlistInfiniteOptions = (userId: string, limit = 20) => ({
  queryKey: ['user-want-to-play', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getUserWishlist(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: WishlistResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5,
});

async function checkGameInWishlist(gameId: string): Promise<{ inWishlist: boolean }> {
  const res = await api["want-to-play"].check[":gameId"].$get({ param: { gameId } });
  if (!res.ok) throw new Error("Failed to check wishlist status");
  return res.json() as Promise<{ inWishlist: boolean }>;
}

export const gameInWishlistQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['want-to-play-check', gameId],
    queryFn: () => checkGameInWishlist(gameId),
    staleTime: 1000 * 60,
  });

async function getWantToPlayCount(gameId: string): Promise<{ count: number }> {
  const res = await api["want-to-play"].game[":gameId"].count.$get({ param: { gameId } });
  if (!res.ok) throw new Error("Failed to fetch want to play count");
  return res.json() as Promise<{ count: number }>;
}

export const gameWantToPlayCountQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['want-to-play-count', gameId],
    queryFn: () => getWantToPlayCount(gameId),
    staleTime: 1000 * 30,
  });

export async function addToWishlist(gameId: string): Promise<{ added: boolean }> {
  const res = await api["want-to-play"][":gameId"].$post({ param: { gameId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to add to wishlist");
  }
  return res.json() as Promise<{ added: boolean }>;
}

export async function removeFromWishlist(gameId: string): Promise<{ removed: boolean }> {
  const res = await api["want-to-play"][":gameId"].$delete({ param: { gameId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to remove from wishlist");
  }
  return res.json() as Promise<{ removed: boolean }>;
}
