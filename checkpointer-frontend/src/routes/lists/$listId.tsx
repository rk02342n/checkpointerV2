import { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  gameListQueryOptions,
  gameListAuthQueryOptions,
  deleteList,
  removeGameFromList,
  uploadListCover,
  removeListCover,
  getListCoverUrl,
  type GameListDetail,
  type GameListGame,
} from "@/lib/gameListsQuery";
import { dbUserQueryOptions } from "@/lib/api";
import {
  Gamepad2,
  Lock,
  Globe,
  Trash2,
  ArrowLeft,
  Loader2,
  Camera,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/lists/$listId")({
  component: ListDetailView,
});

function ListDetailView() {
  const { listId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [gameToRemove, setGameToRemove] = useState<GameListGame | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Get current user
  const { data: dbUserData } = useQuery(dbUserQueryOptions);
  const isLoggedIn = !!dbUserData?.account;

  // Use auth query if logged in, otherwise public query
  const { data, isLoading, error } = useQuery(
    isLoggedIn
      ? gameListAuthQueryOptions(listId)
      : gameListQueryOptions(listId)
  );

  const list = data?.list;
  const isOwner = (list as GameListDetail & { isOwner?: boolean })?.isOwner ?? false;

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      toast.success("List deleted");
      navigate({ to: "/profile" });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete list");
    },
  });

  // Remove game mutation
  const removeGameMutation = useMutation({
    mutationFn: (gameId: string) => removeGameFromList(listId, gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-list", listId] });
      queryClient.invalidateQueries({ queryKey: ["game-list-auth", listId] });
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      toast.success("Game removed from list");
      setGameToRemove(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove game");
    },
  });

  // Upload cover mutation
  const uploadCoverMutation = useMutation({
    mutationFn: (file: File) => uploadListCover(listId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-list", listId] });
      queryClient.invalidateQueries({ queryKey: ["game-list-auth", listId] });
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      toast.success("Cover uploaded!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to upload cover");
    },
  });

  // Remove cover mutation
  const removeCoverMutation = useMutation({
    mutationFn: () => removeListCover(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-list", listId] });
      queryClient.invalidateQueries({ queryKey: ["game-list-auth", listId] });
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      toast.success("Cover removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove cover");
    },
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use jpeg, png, webp, or gif.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max size is 5MB.");
      return;
    }

    uploadCoverMutation.mutate(file);
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <ListDetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="bg-rose-100 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 text-center">
            <Gamepad2 className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">List Not Found</h2>
            <p className="text-stone-600 mb-4">
              This list doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate({ to: "/" })}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = list.ownerUsername
    ? list.ownerUsername.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 text-stone-900 selection:bg-orange-300/30">
      <Navbar />

      <div className="container mx-auto max-w-4xl px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate({ to: '/profile' })}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Hidden file input for cover upload */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleCoverChange}
          className="hidden"
        />

        {/* Cover Image Section */}
        {(list.coverUrl || isOwner) && (
          <div className="mb-6">
            {list.coverUrl ? (
              <div className="relative">
                <img
                  src={getListCoverUrl(listId)}
                  alt={`${list.name} cover`}
                  className="w-full aspect-[21/9] object-cover border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]"
                />
                {isOwner && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadCoverMutation.isPending}
                      className="p-2 bg-stone-900 text-white hover:bg-stone-700 transition-colors disabled:opacity-50"
                      title="Change cover"
                    >
                      {uploadCoverMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeCoverMutation.mutate()}
                      disabled={removeCoverMutation.isPending}
                      className="p-2 bg-rose-600 text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
                      title="Remove cover"
                    >
                      {removeCoverMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : isOwner ? (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadCoverMutation.isPending}
                className="w-full aspect-[21/9] border-4 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                {uploadCoverMutation.isPending ? (
                  <>
                    <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
                    <span className="text-sm text-stone-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-stone-400" />
                    <span className="text-sm text-stone-600">Add a cover image</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        )}

        {/* List Header */}
        <div className="bg-orange-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
                  {list.name}
                </h1>
                {list.visibility === "private" ? (
                  <Lock className="w-5 h-5 text-stone-600" />
                ) : (
                  <Globe className="w-5 h-5 text-stone-600" />
                )}
              </div>

              {list.description && (
                <p className="text-stone-700 mb-4">{list.description}</p>
              )}

              {/* Owner Info */}
              <Link
                to={list.userId === dbUserData?.account?.id ? "/profile" : "/users/$userId"}
                params={list.userId === dbUserData?.account?.id ? {} : { userId: list.userId }}
                className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-6 h-6 border-2 border-stone-900">
                  <AvatarImage
                    src={
                      list.ownerAvatarUrl
                        ? list.ownerAvatarUrl.startsWith("http")
                          ? list.ownerAvatarUrl
                          : `/api/user/avatar/${list.userId}`
                        : undefined
                    }
                    alt={list.ownerUsername || "User"}
                  />
                  <AvatarFallback className="bg-orange-100 text-stone-900 text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-stone-700">
                  @{list.ownerUsername || "unknown"}
                </span>
              </Link>

              <div className="flex items-center gap-4 mt-4 text-sm text-stone-600">
                <span>
                  {list.gameCount} {list.gameCount === 1 ? "game" : "games"}
                </span>
                <span>
                  Updated {new Date(list.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="border-2 border-stone-900 rounded-none text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Games List */}
        <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]">
          <div className="border-b-4 border-stone-900 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-900">
              Games in this List
            </h2>
          </div>

          {list.games.length === 0 ? (
            <div className="p-8 text-center">
              <Gamepad2 className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <p className="text-stone-900 font-bold mb-2">No games yet</p>
              <p className="text-stone-600 text-sm">
                {isOwner
                  ? "Add games to this list from any game page."
                  : "This list is empty."}
              </p>
            </div>
          ) : (
            <div className="divide-y-4 divide-stone-900">
              {list.games.map((game, index) => (
                <div
                  key={game.gameId}
                  className="flex items-center gap-4 p-4 hover:bg-orange-50 transition-colors"
                >
                  {/* Position Number */}
                  <div className="w-8 h-8 flex items-center justify-center bg-stone-900 text-white font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Game Cover */}
                  <Link
                    to="/games/$gameId"
                    params={{ gameId: game.gameId }}
                    className="flex-shrink-0"
                  >
                    {game.gameCoverUrl ? (
                      <img
                        src={game.gameCoverUrl}
                        alt={game.gameName}
                        className="w-16 h-20 object-cover border-2 border-stone-900"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900 flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-stone-500" />
                      </div>
                    )}
                  </Link>

                  {/* Game Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/games/$gameId"
                      params={{ gameId: game.gameId }}
                      className="font-bold text-stone-900 hover:underline block truncate"
                    >
                      {game.gameName}
                    </Link>
                    {game.gameReleaseDate && (
                      <p className="text-stone-600 text-sm">
                        {new Date(game.gameReleaseDate).getFullYear()}
                      </p>
                    )}
                  </div>

                  {/* Remove Button (Owner only) */}
                  {isOwner && (
                    <button
                      onClick={() => setGameToRemove(game)}
                      className="p-2 text-stone-500 hover:text-rose-600 transition-colors"
                      title="Remove from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete List Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] rounded-none">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{list.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete List"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Game Dialog */}
      <Dialog open={!!gameToRemove} onOpenChange={() => setGameToRemove(null)}>
        <DialogContent className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] rounded-none">
          <DialogHeader>
            <DialogTitle>Remove Game</DialogTitle>
            <DialogDescription>
              Remove "{gameToRemove?.gameName}" from this list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setGameToRemove(null)}
              disabled={removeGameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => gameToRemove && removeGameMutation.mutate(gameToRemove.gameId)}
              disabled={removeGameMutation.isPending}
            >
              {removeGameMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-16 mb-6 bg-stone-200" />
      <div className="bg-orange-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6 mb-8">
        <Skeleton className="h-8 w-2/3 mb-4 bg-orange-300" />
        <Skeleton className="h-4 w-full mb-2 bg-orange-300" />
        <div className="flex items-center gap-2 mt-4">
          <Skeleton className="w-6 h-6 rounded-full bg-orange-300" />
          <Skeleton className="h-4 w-24 bg-orange-300" />
        </div>
      </div>
      <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]">
        <div className="border-b-4 border-stone-900 p-4">
          <Skeleton className="h-4 w-32 bg-stone-200" />
        </div>
        <div className="divide-y-4 divide-stone-900">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-8 h-8 bg-stone-200" />
              <Skeleton className="w-16 h-20 bg-stone-200" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2 bg-stone-200" />
                <Skeleton className="h-4 w-16 bg-stone-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
