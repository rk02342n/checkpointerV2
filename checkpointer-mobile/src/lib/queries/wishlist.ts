import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const wishlistQueryOptions = queryOptions({
  queryKey: ["wishlist"],
  queryFn: async () => {
    const res = await api["want-to-play"].$get({ query: { limit: "50" } });
    if (!res.ok) {
      throw new Error("Server error");
    }
    return res.json();
  },
  staleTime: 1000 * 60,
});

export const wishlistCheckQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ["wishlist-check", gameId],
    queryFn: async () => {
      const res = await api["want-to-play"].check[":gameId"].$get({
        param: { gameId },
      });
      if (!res.ok) {
        throw new Error("Server error");
      }
      return res.json();
    },
    staleTime: 1000 * 60,
  });

export function useToggleWishlist(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inWishlist: boolean) => {
      const res = inWishlist
        ? await api["want-to-play"][":gameId"].$delete({ param: { gameId } })
        : await api["want-to-play"][":gameId"].$post({ param: { gameId } });
      if (!res.ok) {
        throw new Error("Could not update wishlist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-check", gameId] });
    },
  });
}
