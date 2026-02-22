import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Plus, ListPlus } from "lucide-react";
import { Button } from "./ui/button";
import { GameListCard } from "./GameListCard";
import { CreateListModal } from "./CreateListModal";
import { LoadMoreButton } from "./LoadMoreButton";
import {
  myGameListsInfiniteOptions,
  userGameListsInfiniteOptions,
  type GameListSummary,
} from "@/lib/gameListsQuery";
import { dbUserQueryOptions } from "@/lib/api";
import { Skeleton } from "./ui/skeleton";

interface ListsSectionProps {
  userId?: string; // If provided, show user's public lists; otherwise show own lists
  isOwnProfile?: boolean;
  showSaveButtons?: boolean;
}

export function ListsSection({ userId, isOwnProfile = false, showSaveButtons = false }: ListsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: dbUserData } = useQuery({ ...dbUserQueryOptions, retry: false });
  const isLoggedIn = !!dbUserData?.account;

  // Use appropriate query based on whether viewing own profile or someone else's
  const useOwnLists = isOwnProfile || (!userId);
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    ...(useOwnLists ? myGameListsInfiniteOptions() : userGameListsInfiniteOptions(userId!)),
    enabled: useOwnLists ? isLoggedIn : !!userId,
  });

  const lists: GameListSummary[] = data?.pages.flatMap(p => p.lists) ?? [];

  if (isLoading) {
    return <ListsSectionSkeleton />;
  }

  if (lists.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <ListPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-foreground font-bold mb-2">No lists yet</p>
          <p className="text-muted-foreground text-sm mb-4">
            {isOwnProfile
              ? "Create a list to organize your favorite games!"
              : "This user hasn't created any public lists yet."}
          </p>
          {isOwnProfile && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-foreground hover:bg-foreground/90 text-background border-4 border-border rounded-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First List
            </Button>
          )}
        </div>

        {isOwnProfile && (
          <CreateListModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
          />
        )}
      </>
    );
  }

  return (
    <>
      {isOwnProfile && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            className="border-4 border-border rounded-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            New List
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lists.map((list) => (
          <GameListCard key={list.id} list={list} showSaveButton={showSaveButtons} showSaveCount={isOwnProfile} />
        ))}
      </div>

      <LoadMoreButton
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

      {isOwnProfile && (
        <CreateListModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </>
  );
}

function ListsSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] overflow-hidden"
        >
          <Skeleton className="aspect-[16/9] bg-muted-foreground/20" />
          <div className="p-3">
            <Skeleton className="h-5 w-3/4 bg-muted-foreground/20 mb-2" />
            <Skeleton className="h-4 w-full bg-muted-foreground/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
