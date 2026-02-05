import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, ListPlus } from "lucide-react";
import { Button } from "./ui/button";
import { GameListCard } from "./GameListCard";
import { CreateListModal } from "./CreateListModal";
import {
  myGameListsQueryOptions,
  userGameListsQueryOptions,
  type GameListSummary,
} from "@/lib/gameListsQuery";
import { Skeleton } from "./ui/skeleton";

interface ListsSectionProps {
  userId?: string; // If provided, show user's public lists; otherwise show own lists
  isOwnProfile?: boolean;
}

export function ListsSection({ userId, isOwnProfile = false }: ListsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Use appropriate query based on whether viewing own profile or someone else's
  const { data, isLoading } = useQuery(
    userId && !isOwnProfile
      ? userGameListsQueryOptions(userId)
      : myGameListsQueryOptions
  );

  const lists: GameListSummary[] = data?.lists ?? [];

  if (isLoading) {
    return <ListsSectionSkeleton />;
  }

  if (lists.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <ListPlus className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-900 font-bold mb-2">No lists yet</p>
          <p className="text-stone-600 text-sm mb-4">
            {isOwnProfile
              ? "Create a list to organize your favorite games!"
              : "This user hasn't created any public lists yet."}
          </p>
          {isOwnProfile && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white border-4 border-stone-900 rounded-none"
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
            className="border-4 border-stone-900 rounded-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            New List
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lists.map((list) => (
          <GameListCard key={list.id} list={list} />
        ))}
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

function ListsSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] overflow-hidden"
        >
          <Skeleton className="aspect-[16/9] bg-stone-200" />
          <div className="p-3">
            <Skeleton className="h-5 w-3/4 bg-stone-200 mb-2" />
            <Skeleton className="h-4 w-full bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
