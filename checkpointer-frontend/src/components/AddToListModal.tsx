import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Check, Lock, Gamepad2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  listsForGameQueryOptions,
  addGameToList,
  removeGameFromList,
  type GameListWithStatus,
} from "@/lib/gameListsQuery";
import { toast } from "sonner";
import { CreateListModal } from "./CreateListModal";

interface AddToListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameName: string;
  gameCoverUrl?: string | null;
}

export function AddToListModal({
  open,
  onOpenChange,
  gameId,
  gameName,
  gameCoverUrl,
}: AddToListModalProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingListId, setPendingListId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    ...listsForGameQueryOptions(gameId),
    enabled: open,
  });

  const lists = data?.lists ?? [];

  const addMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => addGameToList(listId, gameId),
    onMutate: async ({ listId }) => {
      setPendingListId(listId);
      await queryClient.cancelQueries({ queryKey: ["lists-for-game", gameId] });

      const previous = queryClient.getQueryData<{ lists: GameListWithStatus[] }>(["lists-for-game", gameId]);

      queryClient.setQueryData(["lists-for-game", gameId], (old: { lists: GameListWithStatus[] } | undefined) => {
        if (!old) return old;
        return {
          lists: old.lists.map((list) =>
            list.id === listId ? { ...list, hasGame: true, gameCount: list.gameCount + 1 } : list
          ),
        };
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["lists-for-game", gameId], context.previous);
      }
      toast.error(error.message || "Failed to add to list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      queryClient.invalidateQueries({ queryKey: ["game-list"] });
      toast.success("Added to list!");
    },
    onSettled: () => {
      setPendingListId(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => removeGameFromList(listId, gameId),
    onMutate: async ({ listId }) => {
      setPendingListId(listId);
      await queryClient.cancelQueries({ queryKey: ["lists-for-game", gameId] });

      const previous = queryClient.getQueryData<{ lists: GameListWithStatus[] }>(["lists-for-game", gameId]);

      queryClient.setQueryData(["lists-for-game", gameId], (old: { lists: GameListWithStatus[] } | undefined) => {
        if (!old) return old;
        return {
          lists: old.lists.map((list) =>
            list.id === listId ? { ...list, hasGame: false, gameCount: Math.max(0, list.gameCount - 1) } : list
          ),
        };
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["lists-for-game", gameId], context.previous);
      }
      toast.error(error.message || "Failed to remove from list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      queryClient.invalidateQueries({ queryKey: ["game-list"] });
      toast.success("Removed from list");
    },
    onSettled: () => {
      setPendingListId(null);
    },
  });

  const handleToggle = (list: GameListWithStatus) => {
    if (list.hasGame) {
      removeMutation.mutate({ listId: list.id });
    } else {
      addMutation.mutate({ listId: list.id });
    }
  };

  const handleCreateSuccess = (listId: string) => {
    // After creating, add the game to the new list
    addMutation.mutate({ listId });
    queryClient.invalidateQueries({ queryKey: ["lists-for-game", gameId] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-background border-4 border-border text-foreground shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] rounded-none w-[calc(100%-2rem)] sm:max-w-md p-0 gap-0 max-h-[90vh] flex flex-col"
          showCloseButton={true}
        >
          <DialogHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
            <DialogTitle className="font-bold text-lg sm:text-xl">
              Add to List
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 sm:p-6 pt-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Game Preview */}
            <div className="flex items-center gap-3 p-3 dark:bg-green-900 bg-green-300 border-2 border-border">
              {gameCoverUrl ? (
                <img
                  className="w-10 h-12 object-cover border-2 border-border shrink-0"
                  src={gameCoverUrl}
                  alt={gameName}
                />
              ) : (
                <div className="w-10 h-12 bg-stone-200 border-2 border-stone-900 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-5 h-5 text-stone-500" />
                </div>
              )}
              <span className="font-medium text-sm truncate">{gameName}</span>
            </div>

            {/* Lists */}
            <div className="flex-1 min-h-0 overflow-y-auto border-4 border-border bg-muted">
              {isLoading ? (
                <div className="flex items-center justify-center h-full min-h-[150px]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading lists...</span>
                </div>
              ) : lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[150px] p-4">
                  <span className="text-sm text-center mb-3">You don't have any lists yet</span>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-stone-900 hover:bg-stone-800 text-foreground border-4 border-border rounded-none"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First List
                  </Button>
                </div>
              ) : (
                <div className="divide-y-2">
                  {lists.map((list) => {
                    const isPending = pendingListId === list.id;
                    return (
                      <button
                        key={list.id}
                        onClick={() => handleToggle(list)}
                        disabled={isPending}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          list.hasGame
                            ? "bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
                            : "hover:bg-orange-100 hover:dark:bg-orange-800"
                        } ${isPending ? "opacity-50" : ""}`}
                      >
                        <div
                          className={`w-6 h-6 flex items-center justify-center border-2 ${
                            list.hasGame
                              ? "bg-green-500 border-green-600 dark:bg-green-900 dark:hover:bg-green-800"
                              : "bg-white border-stone-400"
                          }`}
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : list.hasGame ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">
                              {list.name}
                            </span>
                            {list.visibility === "private" && (
                              <Lock className="w-3 h-3 text-stone-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {list.gameCount} {list.gameCount === 1 ? "game" : "games"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New List Button */}
            {lists.length > 0 && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="w-full border-4 border-stone-900 rounded-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New List
              </Button>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='pop' className="mb-4 mr-6 bg-black text-white">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateListModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
