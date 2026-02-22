import { useState, useEffect } from "react";
import { usePostHog } from 'posthog-js/react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Gamepad2, Loader2, ConciergeBell, History, X, CalendarHeart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useDebounce } from "@/lib/useDebounce";
import { getSearchGamesQueryOptions, type Game } from "@/lib/gameQuery";
import {
  currentlyPlayingQueryOptions,
  setCurrentlyPlaying,
  stopPlaying,
  logPastGame,
  type SessionStatus,
} from "@/lib/gameSessionsQuery";
import { addToWishlist } from "@/lib/wantToPlayQuery";
import { dbUserQueryOptions } from "@/lib/api";

interface LogGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedGame?: Game | null;
}

type LogType = "currently-playing" | "played-before" | "want-to-play";

export function LogGameModal({ open, onOpenChange, preselectedGame }: LogGameModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [logType, setLogType] = useState<LogType>("currently-playing");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  // Set preselected game when modal opens
  useEffect(() => {
    if (open && preselectedGame) {
      setSelectedGame(preselectedGame);
    }
  }, [open, preselectedGame]);

  const { data: dbUserData } = useQuery({ ...dbUserQueryOptions, retry: false });
  const isLoggedIn = !!dbUserData?.account;

  // Check if user has a currently playing game
  const { data: currentlyPlayingData } = useQuery({
    ...currentlyPlayingQueryOptions,
    enabled: open && isLoggedIn,
  });

  const hasCurrentGame = !!currentlyPlayingData?.game;

  const { data, isLoading, isError } = useQuery(
    getSearchGamesQueryOptions(debouncedSearchQuery)
  );

  const games: Game[] = data?.games || [];

  // Mutation for setting currently playing
  const setCurrentMutation = useMutation({
    mutationFn: setCurrentlyPlaying,
    onSuccess: () => {
      invalidateAndClose();
    },
  });

  // Mutation for logging past game
  const logPastMutation = useMutation({
    mutationFn: (gameId: string) => logPastGame(gameId, "finished"),
    onSuccess: () => {
      invalidateAndClose();
    },
  });

  // Mutation for stopping current game
  const stopPlayingMutation = useMutation({
    mutationFn: stopPlaying,
  });

  // Mutation for adding to wishlist
  const addToWishlistMutation = useMutation({
    mutationFn: (gameId: string) => addToWishlist(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["want-to-play"] });
      queryClient.invalidateQueries({ queryKey: ["want-to-play-check"] });
      queryClient.invalidateQueries({ queryKey: ["want-to-play-count"] });
      onOpenChange(false);
      resetState();
    },
  });

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ["currently-playing"] });
    queryClient.invalidateQueries({ queryKey: ["play-history"] });
    queryClient.invalidateQueries({ queryKey: ["game-sessions"] });
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setSearchQuery("");
    setSelectedGame(null);
    setShowConfirmDialog(false);
    setLogType("currently-playing");
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    setSelectedGame(null);
  };

  const handleSubmit = () => {
    if (!selectedGame) return;

    posthog.capture('game_logged', { game_id: String(selectedGame.id), game_name: selectedGame.name, log_type: logType });

    if (logType === "want-to-play") {
      addToWishlistMutation.mutate(String(selectedGame.id));
    } else if (logType === "played-before") {
      logPastMutation.mutate(String(selectedGame.id));
    } else {
      // Currently playing
      if (hasCurrentGame) {
        setShowConfirmDialog(true);
      } else {
        setCurrentMutation.mutate(String(selectedGame.id));
      }
    }
  };

  const handleConfirmReplace = async (status: SessionStatus) => {
    if (!selectedGame) return;

    await stopPlayingMutation.mutateAsync(status);
    setCurrentMutation.mutate(String(selectedGame.id));
  };

  const formatYear = (value: Game["releaseDate"]) => {
    if (!value) return null;
    const d = typeof value === "string" ? new Date(value) : value;
    const y = d.getFullYear();
    return Number.isFinite(y) ? y : null;
  };

  const isPending = setCurrentMutation.isPending || logPastMutation.isPending || stopPlayingMutation.isPending || addToWishlistMutation.isPending;
  const error = setCurrentMutation.error || logPastMutation.error || stopPlayingMutation.error || addToWishlistMutation.error;

  // Confirmation dialog for replacing current game
  if (showConfirmDialog && selectedGame && currentlyPlayingData?.game) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetState();
        }
        onOpenChange(isOpen);
      }}>
        <DialogContent
          className="bg-background border-4 border-border text-foreground shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] rounded-none w-[calc(100%-2rem)] sm:max-w-md"
          showCloseButton={true}
        >
          <DialogHeader>
            <DialogTitle className="font-bold text-lg sm:text-xl">
              Replace Current Game?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              You're currently playing <span className="font-semibold">{currentlyPlayingData.game.name}</span>.
              What would you like to do with it?
            </p>

            {/* Current game card */}
            <div className="flex items-center gap-3 p-3 bg-muted border-2">
              {currentlyPlayingData.game.coverUrl ? (
                <img
                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover border-2 border-border shrink-0"
                  src={currentlyPlayingData.game.coverUrl}
                  alt={currentlyPlayingData.game.name}
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-200 border-2 border-border flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-stone-500" />
                </div>
              )}
              <span className="text-foreground font-medium text-sm sm:text-base truncate">{currentlyPlayingData.game.name}</span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-600 text-sm">
                {error.message}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              className="w-full sm:flex-1 bg-blue-100 hover:bg-blue-200 dark:hover:bg-blue-600 dark:bg-blue-800 text-foreground border-4 border-stone-900 font-semibold rounded-none"
              onClick={() => handleConfirmReplace("stashed")}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Stash It
            </Button>
            <Button
              variant="outline"
              className="w-full sm:flex-1 bg-green-100 hover:bg-green-200 dark:hover:bg-green-600 dark:bg-green-800 text-foreground border-4 border-stone-900 font-semibold rounded-none"
              onClick={() => handleConfirmReplace("finished")}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Mark Finished
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Main search dialog
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetState();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent
        className="bg-background border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] rounded-none w-[calc(100%-2rem)] sm:max-w-md p-0 gap-0 max-h-[90vh] flex flex-col"
        showCloseButton={true}
      >
        <DialogHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <DialogTitle className="text-foreground font-bold text-lg sm:text-xl">
            Log a Game
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden p-4 sm:p-6 pt-4 gap-4">
          {/* Log Type Selection */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              onClick={() => setLogType("currently-playing")}
              className={`flex flex-col items-center justify-center h-full gap-2 p-2 sm:p-3 border-4 font-semibold text-[10px] sm:text-xs transition-colors ${
                logType === "currently-playing"
                  ? "bg-green-200 border-border dark:bg-green-800"
                  : "bg-muted border-border"
              }`}
            >
              <ConciergeBell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Playing</span>
            </Button>
            <Button
              type="button"
              onClick={() => setLogType("played-before")}
              className={`flex flex-col items-center justify-center gap-2 p-2 h-full sm:p-3 border-4 font-semibold text-[10px] sm:text-xs transition-colors ${
                logType === "played-before"
                  ? "bg-orange-200 border-border dark:bg-fuchsia-800"
                  : "bg-muted border-border"
              }`}
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Played</span>
            </Button>
            <Button
              type="button"
              onClick={() => setLogType("want-to-play")}
              className={`flex flex-col items-center justify-center gap-2 p-2 h-full sm:p-3 border-4 font-semibold text-[10px] sm:text-xs transition-colors ${
                logType === "want-to-play"
                  ? "bg-amber-200 border-border dark:bg-amber-700"
                  : "bg-muted border-border"
              }`}
            >
              <CalendarHeart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Want to Play</span>
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for a game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border-4 border-border text-foreground py-2 pl-10 pr-4 focus:ring-2 text-sm rounded-none"
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
          </div>

          {/* Search Results */}
          {debouncedSearchQuery && (
          <div className="flex-1 min-h-0 overflow-y-auto border-4 border-border bg-background">
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[150px] sm:min-h-[200px]">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground animate-spin" />
                <span className="ml-2 text-muted-foreground text-xs sm:text-sm">Searching...</span>
              </div>
            ) : isError ? (
              <div className="p-4 text-center text-rose-600 text-xs sm:text-sm">
                Error searching games. Please try again.
              </div>
            ) : games.length > 0 ? (
              <div className="divide-y-2 divide-stone-200">
                {games.map((game) => {
                  const year = formatYear(game.releaseDate);
                  const isSelected = selectedGame?.id === game.id;
                  return (
                    <div
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-orange-200 dark:bg-orange-900"
                          : "hover:bg-orange-100 dark:hover:bg-orange-700"
                      }`}
                    >
                      {game.coverUrl ? (
                        <img
                          className="w-10 h-10 sm:w-12 sm:h-12 object-cover border-2 border-border shrink-0"
                          src={game.coverUrl}
                          alt={game.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-background border-2 border-stone-900 flex items-center justify-center shrink-0">
                          <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-stone-500" />
                        </div>
                      )}
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <div className="text-foreground text-xs sm:text-sm font-semibold truncate">
                          {game.name}
                        </div>
                        {year && (
                          <div className="text-muted-foreground text-xs">{year}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[150px] sm:min-h-[200px] text-muted-foreground">
                <span className="text-xs sm:text-sm">No games found</span>
              </div>
            )}
          </div>
          )}

          {/* Selected Game Strip */}
          {selectedGame && (
            <div className="flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-900 border-4 border-stone-900">
              {selectedGame.coverUrl ? (
                <img
                  className="w-10 h-10 object-cover border-2 border-border shrink-0"
                  src={selectedGame.coverUrl}
                  alt={selectedGame.name}
                />
              ) : (
                <div className="w-10 h-10 bg-background border-2 border-stone-900 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Selected</div>
                <div className="text-foreground text-sm font-semibold truncate">
                  {selectedGame.name}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 hover:bg-orange-200 dark:hover:bg-red-400 transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4 text-stone-600" />
              </button>
            </div>
          )}

          {/* Error Display */}
        </div>

        {/* Submit Button */}
        <div className="p-4 sm:p-6 pt-0 sm:pt-0">
          {!isLoggedIn ? (
            <a
              href="/api/login"
              className="w-full flex items-center justify-center font-semibold py-3 text-sm border-4 border-border bg-background hover:bg-muted transition-colors"
            >
              Log in to log games
            </a>
          ) : (
          <Button
            className="w-full  font-semibold rounded-none py-3 text-sm"
            variant='outline'
            onClick={handleSubmit}
            disabled={!selectedGame || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {logType === "want-to-play" ? "Adding..." : "Logging..."}
              </>
            ) : (
              <>
                {logType === "currently-playing" && "Start Playing"}
                {logType === "played-before" && "Log Game"}
                {logType === "want-to-play" && "Add to Wishlist"}
              </>
            )}
          </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
