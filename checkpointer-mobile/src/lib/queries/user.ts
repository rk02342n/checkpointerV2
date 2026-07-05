import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";

// Same workaround as the web frontend: Hono's middleware response unions
// collapse this route's inferred type, so the account shape is declared once
// and asserted.
export type Account = {
  id: string;
  kindeId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  profileGifUrl: string | null;
  role: "free" | "pro" | "admin";
  isPublic: boolean;
  suspendedAt: string | null;
  createdAt: string;
};

export const accountQueryOptions = queryOptions({
  queryKey: ["account"],
  queryFn: async () => {
    const res = await api.user.account.$get();
    if (!res.ok) {
      throw new Error("Server error");
    }
    const data = (await res.json()) as { account: Account };
    return data.account;
  },
  staleTime: Infinity,
});
