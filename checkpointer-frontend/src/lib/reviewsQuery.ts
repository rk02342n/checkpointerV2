import { queryOptions } from "@tanstack/react-query";
import { type CreateReview } from "../../../server/db/schema/reviews";
import { api } from "@/lib/api";

export type GameReview = {
  id: string
  userId: string
  gameId: string
  rating: string | null
  reviewText: string | null
  createdAt: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  likeCount: number
  userLiked: boolean
}

export async function toggleReviewLike(reviewId: string): Promise<{ liked: boolean }> {
  const res = await api.reviews[":reviewId"].like.$post({ param: { reviewId } });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Please log in to like reviews");
    if (res.status === 404) throw new Error("Review not found");
    throw new Error("Failed to toggle like");
  }
  return res.json();
}

export async function getReviewByGameAndUser(gameId: string, userId: string) {
  const res = await api.reviews.game[":gameId"].user[":userId"].$get({ param: { gameId, userId } });
  if (!res.ok) throw new Error("Failed to fetch review");
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export const getReviewsByGameAndUserQueryOptions = (gameId: string, userId: string) =>
  queryOptions({
    queryKey: ['get-reviews-game-user', gameId, userId],
    queryFn: () => getReviewByGameAndUser(gameId, userId),
    staleTime: 1000 * 60 * 5
  })

export async function getReviewsByGameId(gameId: string): Promise<GameReview[]> {
  const res = await api.reviews.game[":gameId"].$get({ param: { gameId } });
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json() as Promise<GameReview[]>;
}

export const getReviewsByGameIdQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ['get-reviews-game', gameId],
    queryFn: () => getReviewsByGameId(gameId),
    staleTime: 1000 * 60 * 5
  })

export type UserReviewsResponse = {
  reviews: Array<{
    id: string
    userId: string
    gameId: string
    rating: number
    reviewText: string
    createdAt: string
    username: string | null
    displayName: string | null
    avatarUrl: string | null
    gameName: string | null
    gameCoverUrl: string | null
    likeCount: number
    userLiked: boolean
  }>
  hasMore: boolean
  nextOffset: number | null
  totalCount: number
}

export async function getReviewsByUserId(userId: string, offset = 0, limit = 10): Promise<UserReviewsResponse> {
  const res = await fetch(`/api/reviews/user/${userId}?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export const getReviewsByUserIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['get-reviews-user', userId],
    queryFn: () => getReviewsByUserId(userId),
    staleTime: 1000 * 60 * 5
  })

export const getAllReviewsByUserIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['get-all-reviews-user', userId],
    queryFn: () => getReviewsByUserId(userId, 0, 500),
    staleTime: 1000 * 60 * 5
  })

export const getReviewsByUserIdInfiniteOptions = (userId: string, limit = 10) => ({
  queryKey: ['get-reviews-user', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getReviewsByUserId(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: UserReviewsResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60 * 5
})

export async function getReviewById(id: string) {
  const res = await fetch(`/api/reviews/${id}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error("Review not found");
    throw new Error("Failed to fetch review");
  }
  return res.json()
}

export async function getReviewStats(gameId: string) {
  const res = await fetch(`/api/reviews/games/${gameId}/stats`)
  if (!res.ok) throw new Error("Failed to fetch review stats");
  return res.json()
}

export async function createReview({value} : {value: CreateReview}) {
  const res = await api.reviews.$post({ json: value });
  if (!res.ok) {
    if (res.status === 409) throw new Error("You have already reviewed this game");
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to create review");
  }
  return res.json();
}

export const loadingCreateReviewQueryOptions = queryOptions<{
  review?: CreateReview
}>({
  queryKey: ['loading-create-review'],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity
});

export async function deleteReview(id: string) {
  const res = await api.reviews[":id"].$delete({ param: { id } });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Review not found");
    if (res.status === 403) throw new Error("You can only delete your own reviews");
    throw new Error("Failed to delete review");
  }
  return res.json();
}
