import { queryOptions } from "@tanstack/react-query";
import { type CreateReview } from "../../../server/db/schema/reviews";

  export async function getReviewByGameAndUser(gameId: string, userId: string) {
    const res = await fetch(`/api/reviews/game/${gameId}/user/${userId}`)
    if (!res.ok) {
      throw new Error("Failed to fetch review");
    }
    const data = await res.json()
    return data.length > 0 ? data[0] : null
  }

  export const getReviewsByGameAndUserQueryOptions = (gameId: string, userId: string) => 
    queryOptions({
      queryKey: ['get-reviews-game-user', gameId, userId], 
      queryFn: () => getReviewByGameAndUser(gameId, userId),
      staleTime: 1000 * 60 * 5
  })

  export async function getReviewsByGameId(gameId: string) {
    const res = await fetch(`/api/reviews/game/${gameId}`)
    if (!res.ok) {
      throw new Error("Failed to fetch reviews");
    }
    const data = await res.json()
    return data
  }

  export const getReviewsByGameIdQueryOptions = (gameId: string) => 
    queryOptions({
      queryKey: ['get-reviews-game', gameId],
      queryFn: () => getReviewsByGameId(gameId),
      staleTime: 1000 * 60 * 5
  })
  
  export async function getReviewsByUserId(userId: string) {
    const res = await fetch(`/api/reviews/user/${userId}`)
    if (!res.ok) {
      throw new Error("Failed to fetch reviews");
    }
    const data = await res.json()
    return data
  }

  export const getReviewsByUserIdQueryOptions = (userId: string) => 
    queryOptions({
      queryKey: ['get-reviews-user', userId],
      queryFn: () => getReviewsByUserId(userId),
      staleTime: 1000 * 60 * 5
  })
  
  export async function getReviewById(id: string) {
    const res = await fetch(`/api/reviews/${id}`)
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Review not found");
      }
      throw new Error("Failed to fetch review");
    }
    const data = await res.json()
    return data
  }
  
  export async function getReviewStats(gameId: string) {
    const res = await fetch(`/api/reviews/games/${gameId}/stats`)
    if (!res.ok) {
      throw new Error("Failed to fetch review stats");
    }
    const data = await res.json()
    return data
  }
  
  export async function createReview({value} : {value: CreateReview}) {
    // await new Promise((r) => setTimeout(r, 2000))
    const res = await fetch(`/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value)
    })
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error("You have already reviewed this game");
      }
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      throw new Error("Failed to create review");
    }
    const data = await res.json()
    return data
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

  // export const createReviewMutation = () => 
  //   mutationOptions({
  //     mutationFn: createReview,
  //     onSuccess: () => {
  //       // Invalidate relevant queries after successful creation
  //       queryClient.invalidateQueries({ queryKey: ['get-reviews-game-user'] })
  //       queryClient.invalidateQueries({ queryKey: ['get-reviews'] })
  //       queryClient.invalidateQueries({ queryKey: ['review-stats'] })
  //     }
  //   })
  


  
  // export async function updateReview(id: string, reviewData: { rating?: string; reviewText?: string }) {
  //   const res = await fetch(`/api/reviews/${id}`, {
  //     method: 'PATCH',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(reviewData)
  //   })
  //   if (!res.ok) {
  //     if (res.status === 404) {
  //       throw new Error("Review not found");
  //     }
  //     if (res.status === 403) {
  //       throw new Error("You can only update your own reviews");
  //     }
  //     throw new Error("Failed to update review");
  //   }
  //   const data = await res.json()
  //   return data
  // }
  
  // export async function deleteReview(id: string) {
  //   const res = await fetch(`/api/reviews/${id}`, {
  //     method: 'DELETE',
  //   })
  //   if (!res.ok) {
  //     if (res.status === 404) {
  //       throw new Error("Review not found");
  //     }
  //     if (res.status === 403) {
  //       throw new Error("You can only delete your own reviews");
  //     }
  //     throw new Error("Failed to delete review");
  //   }
  //   return true
  // }
