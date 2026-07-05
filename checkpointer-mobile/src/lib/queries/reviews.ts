import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

// The feed resolves userLiked for the bearer-authenticated viewer via
// getOptionalViewer server-side.
export const gameReviewsQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ["game-reviews", gameId],
    queryFn: async () => {
      const res = await api.reviews.game[":gameId"].$get({ param: { gameId } });
      if (!res.ok) {
        throw new Error("Server error");
      }
      return res.json();
    },
    staleTime: 1000 * 60,
  });

export type GameReview = Awaited<
  ReturnType<NonNullable<ReturnType<typeof gameReviewsQueryOptions>["queryFn"]>>
>[number];

// Your own review(s) for a game — the composer shows/creates/deletes these.
export const myGameReviewsQueryOptions = (gameId: string, userId: string) =>
  queryOptions({
    queryKey: ["my-game-reviews", gameId, userId],
    queryFn: async () => {
      const res = await api.reviews.game[":gameId"].user[":userId"].$get({
        param: { gameId, userId },
      });
      if (!res.ok) {
        throw new Error("Server error");
      }
      return res.json();
    },
    staleTime: 1000 * 60,
  });

function useInvalidateReviews(gameId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["game-reviews", gameId] });
    queryClient.invalidateQueries({ queryKey: ["my-game-reviews", gameId] });
    // Review writes recalc the game's cached avg rating server-side.
    queryClient.invalidateQueries({ queryKey: ["game", gameId] });
  };
}

export function useCreateReview(gameId: string) {
  const invalidate = useInvalidateReviews(gameId);
  return useMutation({
    mutationFn: async (input: { rating: string; reviewText?: string }) => {
      const res = await api.reviews.$post({
        json: { gameId, rating: input.rating, reviewText: input.reviewText },
      });
      if (!res.ok) {
        throw new Error("Could not post review");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReview(gameId: string) {
  const invalidate = useInvalidateReviews(gameId);
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await api.reviews[":id"].$delete({ param: { id: reviewId } });
      if (!res.ok) {
        throw new Error("Could not delete review");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });
}

// Optimistic: hearts should not lag on a review feed.
export function useToggleReviewLike(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await api.reviews[":reviewId"].like.$post({
        param: { reviewId },
      });
      if (!res.ok) {
        throw new Error("Could not toggle like");
      }
      return res.json();
    },
    onMutate: async (reviewId: string) => {
      const key = ["game-reviews", gameId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<GameReview[]>(key);
      queryClient.setQueryData<GameReview[]>(key, (old) =>
        old?.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                userLiked: !r.userLiked,
                likeCount: Number(r.likeCount) + (r.userLiked ? -1 : 1),
              }
            : r
        )
      );
      return { previous };
    },
    onError: (_err, _reviewId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["game-reviews", gameId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["game-reviews", gameId] });
    },
  });
}
