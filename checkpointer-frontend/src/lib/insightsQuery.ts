import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type InsightsData = {
  gaming: {
    totalGamesPlayed: number;
    gamesFinished: number;
    gamesStashed: number;
    completionRate: number;
    monthlyActivity: Array<{ month: string; count: number }>;
  };
  genres: Array<{ name: string; count: number; percentage: number }>;
  reviews: {
    totalReviews: number;
    avgRating: number | null;
    ratingDistribution: Array<{ rating: number; count: number }>;
    totalLikesReceived: number;
    mostLikedReview: {
      id: string;
      gameId: string;
      gameName: string;
      rating: string | null;
      likeCount: number;
    } | null;
  };
  social: {
    followerCount: number;
    followingCount: number;
    listsCreated: number;
    listsSavedByOthers: number;
    blogPostsPublished: number;
    wishlistSize: number;
  };
};

async function getInsights(): Promise<InsightsData> {
  const res = await api.insights.$get();
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json() as Promise<InsightsData>;
}

export const insightsQueryOptions = queryOptions({
  queryKey: ["user-insights"],
  queryFn: getInsights,
  staleTime: 1000 * 60 * 10,
});
