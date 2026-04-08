import { Link } from "@tanstack/react-router";
import { Lock, Gamepad2, Bookmark } from "lucide-react";
import { usePostHog } from 'posthog-js/react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type GameListSummary, getListCoverUrl, listSavedQueryOptions, saveList, unsaveList } from "@/lib/gameListsQuery";
import { dbUserQueryOptions } from "@/lib/api";
import { toast } from "sonner";

interface GameListCardProps {
  list: GameListSummary;
  linkPrefix?: string; // "/lists" for public routes
  showSaveButton?: boolean;
  showSaveCount?: boolean;
  themed?: boolean;
}

export function GameListCard({ list, linkPrefix = "/lists", showSaveButton = false, showSaveCount = false, themed = false }: GameListCardProps) {
  const hasCustomCover = !!list.coverUrl;
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { data: dbUserData } = useQuery({ ...dbUserQueryOptions, retry: false });
  const isLoggedIn = !!dbUserData?.account;

  const { data: saveData } = useQuery({
    ...listSavedQueryOptions(list.id),
    enabled: isLoggedIn && (showSaveButton || showSaveCount),
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
    posthog.capture('list_save_toggled', { list_id: list.id, list_name: list.name, action: isSaved ? 'unsaved' : 'saved' });
    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  return (
    <Link
      to={`${linkPrefix}/${list.id}` as string}
      className="block bg-card profile-card profile-card-hover border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] active:translate-x-[2px] active:translate-y-[2px] transition-all overflow-hidden"
    >
      {/* Cover Image */}
      <div className="aspect-21/9 bg-muted relative h-fit">
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
          <div className={`grid h-full ${
            list.gameCoverUrls.length === 1 ? 'grid-cols-1' :
            list.gameCoverUrls.length === 3 ? 'grid-cols-2 grid-rows-2' :
            'grid-cols-2'
          }`}>
            {list.gameCoverUrls.slice(0, 4).map((url, i) => (
              <div key={i} className={`relative overflow-hidden ${
                list.gameCoverUrls.length === 3 && i === 0 ? 'row-span-2' : ''
              }`}>
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
          </div>
        ) : (
          // Empty state
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Game count badge */}
        <div className={`absolute bottom-2 right-2 bg-stone-900 ${themed ? '' : 'dark:bg-stone-700'} text-white text-xs font-bold px-2 py-1`}>
          {list.gameCount} {list.gameCount === 1 ? "game" : "games"}
        </div>
        {/* Save button / save count */}
        {(showSaveButton || (showSaveCount && (saveData?.saveCount ?? 0) > 0)) && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            {showSaveButton && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleSave();
                }}
                disabled={saveMutation.isPending || unsaveMutation.isPending}
                className="p-1.5 bg-amber-50/80 hover:bg-amber-50 border-2 border-border transition-all disabled:opacity-50"
                title={isSaved ? "Unsave list" : "Save list"}
              >
                <Bookmark
                  className={`w-4 h-4 ${isSaved ? 'fill-black text-black' : 'text-black'}`}
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
        <p className="text-muted-foreground text-sm mt-1 line-clamp-2 min-h-10">{list.description || `${list.gameCount} ${list.gameCount === 1 ? "game" : "games"}`}</p>
        {showSaveCount && saveData && saveData.saveCount > 0 && (
          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            {saveData.saveCount} {saveData.saveCount === 1 ? "save" : "saves"}
          </p>
        )}
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
