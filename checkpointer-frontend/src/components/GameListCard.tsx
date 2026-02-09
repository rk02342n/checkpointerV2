import { Link } from "@tanstack/react-router";
import { Lock, Gamepad2, Bookmark } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type GameListSummary, getListCoverUrl, listSavedQueryOptions, saveList, unsaveList } from "@/lib/gameListsQuery";
import { toast } from "sonner";

interface GameListCardProps {
  list: GameListSummary;
  linkPrefix?: string; // "/lists" for public routes
  showSaveButton?: boolean;
  showSaveCount?: boolean;
}

export function GameListCard({ list, linkPrefix = "/lists", showSaveButton = false, showSaveCount = false }: GameListCardProps) {
  const hasCustomCover = !!list.coverUrl;
  const queryClient = useQueryClient();

  const { data: saveData } = useQuery({
    ...listSavedQueryOptions(list.id),
    enabled: showSaveButton || showSaveCount,
  });

  const isSaved = saveData?.isSaved ?? false;

  const saveMutation = useMutation({
    mutationFn: () => saveList(list.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-saved', list.id] });
      queryClient.invalidateQueries({ queryKey: ['my-saved-lists'] });
      toast.success('List saved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save list');
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => unsaveList(list.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-saved', list.id] });
      queryClient.invalidateQueries({ queryKey: ['my-saved-lists'] });
      toast.success('List unsaved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unsave list');
    },
  });

  const handleToggleSave = () => {
    if (saveMutation.isPending || unsaveMutation.isPending) return;
    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  return (
    <Link
      to={`${linkPrefix}/${list.id}` as string}
      className="block bg-background border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all overflow-hidden"
    >
      {/* Cover Image */}
      <div className="aspect-video bg-muted relative">
        {hasCustomCover ? (
          // Custom cover image
          <img
            src={getListCoverUrl(list.id)}
            alt={list.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : list.gameCoverUrls.length > 0 ? (
          // Game cover grid
          <div className="grid grid-cols-2 h-full">
            {list.gameCoverUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative overflow-hidden">
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {/* Fill remaining slots if less than 4 */}
            {Array.from({ length: Math.max(0, 4 - list.gameCoverUrls.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-muted flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Game count badge */}
        <div className="absolute bottom-2 right-2 bg-stone-900 dark:bg-stone-700 text-white text-xs font-bold px-2 py-1">
          {list.gameCount} {list.gameCount === 1 ? "game" : "games"}
        </div>
        {/* Save button / save count */}
        {(showSaveButton || (showSaveCount && saveData?.saveCount)) && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            {saveData?.saveCount ? (
              <span className="text-xs font-bold bg-background/80 border-2 border-border px-1.5 py-0.5">
                {saveData.saveCount}
              </span>
            ) : null}
            {showSaveButton && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleSave();
                }}
                disabled={saveMutation.isPending || unsaveMutation.isPending}
                className="p-1.5 bg-background/80 hover:bg-background border-2 border-border transition-all disabled:opacity-50"
                title={isSaved ? "Unsave list" : "Save list"}
              >
                <Bookmark
                  className={`w-4 h-4 ${isSaved ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* List Info */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground truncate flex-1">{list.name}</h3>
          {list.visibility === "private" && (
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1 line-clamp-2 min-h-10">{list.description || "\u00A0"}</p>
      </div>
    </Link>
  );
}

// Compact version for profile sidebar or smaller spaces
export function GameListCardCompact({ list, linkPrefix = "/lists" }: GameListCardProps) {
  const hasCustomCover = !!list.coverUrl;

  return (
    <Link
      to={`${linkPrefix}/${list.id}` as string}
      className="flex items-center gap-3 p-3 bg-muted border-4 border-border hover:bg-orange-100 dark:hover:bg-muted/80 transition-colors"
    >
      {/* Cover thumbnail */}
      <div className="w-16 h-16 bg-muted border-2 border-border shrink-0 overflow-hidden">
        {hasCustomCover ? (
          <img
            src={getListCoverUrl(list.id)}
            alt={list.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : list.gameCoverUrls.length > 0 ? (
          <div className="grid grid-cols-2 h-full">
            {list.gameCoverUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative overflow-hidden">
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-sm truncate">{list.name}</h3>
          {list.visibility === "private" && (
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {list.gameCount} {list.gameCount === 1 ? "game" : "games"}
        </p>
      </div>
    </Link>
  );
}
