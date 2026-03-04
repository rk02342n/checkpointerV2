import { queryOptions } from "@tanstack/react-query";

export type FollowUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
};

export type FollowListResponse = {
  users: FollowUser[];
  hasMore: boolean;
  nextOffset: number | null;
};

export type FollowCounts = {
  followersCount: number;
  followingCount: number;
};

// Toggle follow/unfollow
export async function toggleFollow(userId: string): Promise<{ following: boolean }> {
  const res = await fetch(`/api/follows/${userId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to toggle follow");
  }
  return res.json();
}

// Check if current user follows target
async function checkFollowStatus(userId: string): Promise<{ following: boolean }> {
  const res = await fetch(`/api/follows/check/${userId}`);
  if (!res.ok) {
    throw new Error("Failed to check follow status");
  }
  return res.json();
}

export const followStatusQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['follow-status', userId],
    queryFn: () => checkFollowStatus(userId),
    staleTime: 1000 * 60, // 1 minute
  });

// Get follower/following counts
async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const res = await fetch(`/api/follows/${userId}/counts`);
  if (!res.ok) {
    throw new Error("Failed to fetch follow counts");
  }
  return res.json();
}

export const followCountsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['follow-counts', userId],
    queryFn: () => getFollowCounts(userId),
    staleTime: 1000 * 60, // 1 minute
  });

// Get followers list (paginated)
async function getFollowers(userId: string, offset = 0, limit = 20): Promise<FollowListResponse> {
  const res = await fetch(`/api/follows/${userId}/followers?offset=${offset}&limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to fetch followers");
  }
  return res.json();
}

export const followersInfiniteOptions = (userId: string, limit: number = 20) => ({
  queryKey: ['followers', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getFollowers(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: FollowListResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60,
});

// Get following list (paginated)
async function getFollowing(userId: string, offset = 0, limit = 20): Promise<FollowListResponse> {
  const res = await fetch(`/api/follows/${userId}/following?offset=${offset}&limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to fetch following");
  }
  return res.json();
}

export const followingInfiniteOptions = (userId: string, limit: number = 20) => ({
  queryKey: ['following', userId],
  queryFn: ({ pageParam = 0 }: { pageParam?: number }) => getFollowing(userId, pageParam, limit),
  initialPageParam: 0,
  getNextPageParam: (lastPage: FollowListResponse) => lastPage.nextOffset,
  staleTime: 1000 * 60,
});
