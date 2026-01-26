import { queryOptions } from "@tanstack/react-query";

// Types
export type UserRole = "free" | "pro" | "admin";

export interface AdminUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  suspendedAt: string | null;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  userId: string;
  gameId: string;
  rating: string | null;
  reviewText: string | null;
  createdAt: string;
  username: string;
  displayName: string | null;
  gameName: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  adminUsername: string;
  adminDisplayName: string | null;
}

export interface AdminStats {
  users: {
    total: number;
    suspended: number;
    newLast7Days: number;
    byRole: Record<string, number>;
  };
  reviews: {
    total: number;
    averageRating: string | null;
  };
  games: {
    total: number;
  };
}

export interface PaginatedResponse<T> {
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
  [key: string]: T[] | boolean | number | null;
}

// API functions
async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch stats");
  }
  return res.json();
}

async function getAdminUsers(limit = 20, offset = 0): Promise<PaginatedResponse<AdminUser> & { users: AdminUser[] }> {
  const res = await fetch(`/api/admin/users?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch users");
  }
  return res.json();
}

async function getAdminReviews(limit = 20, offset = 0): Promise<PaginatedResponse<AdminReview> & { reviews: AdminReview[] }> {
  const res = await fetch(`/api/admin/reviews?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch reviews");
  }
  return res.json();
}

async function getAuditLogs(limit = 20, offset = 0): Promise<PaginatedResponse<AuditLog> & { logs: AuditLog[] }> {
  const res = await fetch(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch audit logs");
  }
  return res.json();
}

// Query options
export const adminStatsQueryOptions = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: getAdminStats,
  staleTime: 1000 * 60, // 1 minute
});

export const adminUsersQueryOptions = (limit = 20, offset = 0) =>
  queryOptions({
    queryKey: ["admin", "users", limit, offset],
    queryFn: () => getAdminUsers(limit, offset),
    staleTime: 1000 * 30, // 30 seconds
  });

export const adminReviewsQueryOptions = (limit = 20, offset = 0) =>
  queryOptions({
    queryKey: ["admin", "reviews", limit, offset],
    queryFn: () => getAdminReviews(limit, offset),
    staleTime: 1000 * 30,
  });

export const auditLogsQueryOptions = (limit = 20, offset = 0) =>
  queryOptions({
    queryKey: ["admin", "audit-logs", limit, offset],
    queryFn: () => getAuditLogs(limit, offset),
    staleTime: 1000 * 30,
  });

// Mutation functions
export async function updateUserRole(userId: string, role: UserRole): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update role");
  }
  return res.json();
}

export async function toggleUserSuspension(userId: string): Promise<{ user: AdminUser; message: string }> {
  const res = await fetch(`/api/admin/users/${userId}/suspend`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update suspension");
  }
  return res.json();
}

export async function deleteReviewAdmin(reviewId: string): Promise<{ message: string }> {
  const res = await fetch(`/api/admin/reviews/${reviewId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete review");
  }
  return res.json();
}
