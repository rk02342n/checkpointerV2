import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type TriggerableJobType = "igdb-sync" | "prune-jobs";
export type IgdbSyncMode = "auto" | "full" | "incremental" | "steam-map-only";

export interface AdminJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  dedupeKey: string | null;
  runAt: string;
  attempts: number;
  maxAttempts: number;
  leaseExpiresAt: string | null;
  progress: { done: number; total: number | null; phase: string } | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncState {
  lastSyncTimestamp: number;
  lastCompletedOffset: number;
  totalGamesProcessed: number;
  status: "idle" | "running" | "failed";
  lastRunAt: string;
  error?: string;
}

export interface JobsOverview {
  counts: Partial<Record<JobStatus, number>>;
  syncStates: {
    igdb: SyncState | null;
    steamAppMap: SyncState | null;
  };
  worker: {
    reachable: boolean;
    interactiveRunning?: number;
    batchRunning?: number;
  };
}

export interface PaginatedResponse<T> {
  hasMore: boolean;
  nextOffset: number | null;
  totalCount: number;
  [key: string]: T[] | boolean | number | null;
}

async function getAdminStats(): Promise<AdminStats> {
  const res = await api.admin.stats.$get();
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch stats");
  }
  return res.json() as Promise<AdminStats>;
}

async function getAdminUsers(limit = 20, offset = 0): Promise<PaginatedResponse<AdminUser> & { users: AdminUser[] }> {
  const res = await api.admin.users.$get({ query: { limit: String(limit), offset: String(offset) } });
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch users");
  }
  return res.json() as Promise<PaginatedResponse<AdminUser> & { users: AdminUser[] }>;
}

async function getAdminReviews(limit = 20, offset = 0): Promise<PaginatedResponse<AdminReview> & { reviews: AdminReview[] }> {
  const res = await api.admin.reviews.$get({ query: { limit: String(limit), offset: String(offset) } });
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch reviews");
  }
  return res.json() as Promise<PaginatedResponse<AdminReview> & { reviews: AdminReview[] }>;
}

async function getAuditLogs(limit = 20, offset = 0): Promise<PaginatedResponse<AuditLog> & { logs: AuditLog[] }> {
  const res = await api.admin["audit-logs"].$get({ query: { limit: String(limit), offset: String(offset) } });
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch audit logs");
  }
  return res.json() as Promise<PaginatedResponse<AuditLog> & { logs: AuditLog[] }>;
}

export const adminStatsQueryOptions = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: getAdminStats,
  staleTime: 1000 * 60,
});

export const adminUsersQueryOptions = (limit = 20, offset = 0) =>
  queryOptions({
    queryKey: ["admin", "users", limit, offset],
    queryFn: () => getAdminUsers(limit, offset),
    staleTime: 1000 * 30,
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

async function getAdminJobs(status?: JobStatus, limit = 50): Promise<{ jobs: AdminJob[] }> {
  const res = await api.admin.jobs.$get({
    query: { limit: String(limit), ...(status ? { status } : {}) },
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch jobs");
  }
  return res.json() as Promise<{ jobs: AdminJob[] }>;
}

async function getJobsOverview(): Promise<JobsOverview> {
  const res = await api.admin.jobs.overview.$get();
  if (!res.ok) {
    if (res.status === 403) throw new Error("Access denied");
    throw new Error("Failed to fetch jobs overview");
  }
  return res.json() as Promise<JobsOverview>;
}

// The jobs tab auto-refreshes while open so a running sync's progress
// (attempts, lease heartbeat, status flips) is visible without reloading.
export const adminJobsQueryOptions = (status?: JobStatus, limit = 50) =>
  queryOptions({
    queryKey: ["admin", "jobs", status ?? "all", limit],
    queryFn: () => getAdminJobs(status, limit),
    refetchInterval: 10_000,
  });

export const jobsOverviewQueryOptions = queryOptions({
  queryKey: ["admin", "jobs-overview"],
  queryFn: getJobsOverview,
  refetchInterval: 10_000,
});

export async function triggerJob(
  type: TriggerableJobType,
  mode?: IgdbSyncMode,
): Promise<{ job: AdminJob }> {
  const res = await api.admin.jobs.trigger.$post({
    json: { type, ...(mode ? { mode } : {}) },
  });
  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    throw new Error(error.error || "Failed to trigger job");
  }
  return res.json() as Promise<{ job: AdminJob }>;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<AdminUser> {
  const res = await api.admin.users[":userId"].role.$patch({ param: { userId }, json: { role } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to update role");
  }
  return res.json() as Promise<AdminUser>;
}

export async function toggleUserSuspension(userId: string): Promise<{ user: AdminUser; message: string }> {
  const res = await api.admin.users[":userId"].suspend.$patch({ param: { userId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to update suspension");
  }
  return res.json() as Promise<{ user: AdminUser; message: string }>;
}

export async function deleteReviewAdmin(reviewId: string): Promise<{ message: string }> {
  const res = await api.admin.reviews[":reviewId"].$delete({ param: { reviewId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to delete review");
  }
  return res.json() as Promise<{ message: string }>;
}
