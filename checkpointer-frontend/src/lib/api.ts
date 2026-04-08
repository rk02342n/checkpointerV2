import { hc } from 'hono/client';
import type { ApiRoutes } from "../../../server/app"; // should be @server/app but viteconfig and tsconfig code doesnt work properly
const client = hc<ApiRoutes>('/');
export const api = client.api;

import { queryOptions } from "@tanstack/react-query";

import { type CreateExpense} from "../../../server/sharedTypes";
import type { ProfileTheme } from "../../../server/lib/profileThemeConstants";

// Explicit account type derived from the users table schema.
// Hono's middleware response unions collapse the inferred type, so we
// declare it once here and reuse it in getDbUser's return annotation.
export type DbAccount = {
  id: string;
  kindeId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  profileGifUrl: string | null;
  role: "free" | "pro" | "admin";
  isPublic: boolean;
  profileTheme: ProfileTheme | null;
  suspendedAt: string | null;
  createdAt: string;
};

async function getCurrentUser() {
    const res = await api.me.$get()
    if(!res.ok){
      throw new Error("Server error");
    }
    return res.json()
  }

async function getDbUser(): Promise<{ account: DbAccount | null }> {
    const res = await api.user.account.$get()
    if (res.status === 401) {
      return { account: null };
    }
    if(!res.ok){
      throw new Error("Server error");
    }
    const data = await res.json() as { account: DbAccount }
    return { account: data.account };
  }

export const userQueryOptions = queryOptions({
    queryKey: ['get-current-user'],
    queryFn: getCurrentUser,
    staleTime: Infinity
  })

export const dbUserQueryOptions = queryOptions({
    queryKey: ['get-db-user'],
    queryFn: getDbUser,
    staleTime: Infinity
  })

export async function getAllExpenses() {
  const res = await api.expenses.$get()
  if(!res.ok){
    throw new Error("Server error");
  }
  return res.json()
}

export const getAllExpensesQueryOptions = queryOptions({
  queryKey: ['get-all-expenses'],
  queryFn: getAllExpenses,
  staleTime: 1000 * 60 * 5
})

export async function createExpense({value} : {value: CreateExpense}){
  await new Promise((r) => setTimeout(r, 3000))
  const res = await api.expenses.$post({ json: value })
  if(!res.ok){
    throw new Error("Error while submitting")
  }
  return res.json()
}

export const loadingCreateExpenseQueryOptions = queryOptions<{
  expense?: CreateExpense
}>({
  queryKey: ['loading-create-expense'],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity
});

export type PublicUserProfile = {
  id: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  profileGifUrl: string | null
  profileTheme: ProfileTheme | null
  createdAt: string
}

async function getPublicUserProfile(userId: string): Promise<PublicUserProfile> {
  const res = await api.user.profile[":userId"].$get({ param: { userId } })
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("User not found")
    }
    throw new Error("Server error")
  }
  const data = await res.json() as { user: PublicUserProfile }
  return data.user
}

export const publicUserProfileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['get-public-user', userId],
    queryFn: () => getPublicUserProfile(userId),
    staleTime: 1000 * 60 * 5
  })

export async function deleteExpense({id}: {id: number}) {
  const res = await api.expenses[":id{[0-9]+}"].$delete({ param: { id: String(id) } });
  if (!res.ok) {
    throw new Error("Server error");
  }
  return res.json()
}

// App Settings
export type AppSettings = {
  darkModeEnabled: boolean;
  featuredGameIds?: string[];
  blogPostsEnabled?: boolean;
}

export async function getAppSettings(): Promise<AppSettings> {
  const res = await api.settings.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch settings");
  }
  return res.json() as Promise<AppSettings>;
}

export async function updateUserProfile(data: {
  displayName?: string | null;
  bio?: string | null;
  isPublic?: boolean;
  profileTheme?: ProfileTheme | null;
}) {
  const res = await api.user.profile.$patch({
    json: data as Parameters<typeof api.user.profile.$patch>[0]["json"]
  });
  if (!res.ok) {
    throw new Error("Failed to update profile");
  }
  return res.json();
}

export async function updateAppSetting(key: string, value: unknown): Promise<void> {
  const res = await api.admin.settings.$patch({ json: { key, value } });
  if (!res.ok) {
    throw new Error("Failed to update setting");
  }
}
