import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const currentSessionQueryOptions = queryOptions({
  queryKey: ["current-session"],
  queryFn: async () => {
    const res = await api["game-sessions"].current.$get();
    if (!res.ok) {
      throw new Error("Server error");
    }
    return res.json();
  },
  staleTime: 1000 * 60,
});

export const playHistoryQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["play-history", userId],
    queryFn: async () => {
      // No zod query validator on this route, so hc types don't accept a
      // `query` arg — the server default (20 most recent) applies.
      const res = await api["game-sessions"].user[":userId"].history.$get({
        param: { userId },
      });
      if (!res.ok) {
        throw new Error("Server error");
      }
      return res.json();
    },
    staleTime: 1000 * 60,
  });

function useInvalidateSessions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["current-session"] });
    queryClient.invalidateQueries({ queryKey: ["play-history"] });
  };
}

export function useSetCurrentlyPlaying() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: async (gameId: string) => {
      const res = await api["game-sessions"].current.$post({ json: { gameId } });
      if (!res.ok) {
        throw new Error("Could not start session");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useStopPlaying() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: async (status: "finished" | "stashed") => {
      const res = await api["game-sessions"].current.$delete({ json: { status } });
      if (!res.ok) {
        throw new Error("Could not stop session");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useLogPastGame() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: async (input: { gameId: string; status: "finished" | "stashed" }) => {
      const res = await api["game-sessions"].history.$post({ json: input });
      if (!res.ok) {
        throw new Error("Could not log game");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });
}
