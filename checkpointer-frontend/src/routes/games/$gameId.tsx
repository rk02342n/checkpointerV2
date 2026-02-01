import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Poster } from "@/components/Poster";
import { Heart, Maximize2, Minimize2, Gamepad2, Check, Clock, Pencil, CalendarHeart, ConciergeBell } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import Navbar from "@/components/Navbar";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getGameByIdQueryOptions, getGameRating } from "@/lib/gameQuery";
import { getReviewsByGameIdQueryOptions, getReviewsByUserIdQueryOptions, loadingCreateReviewQueryOptions, toggleReviewLike, type GameReview } from "@/lib/reviewsQuery";
import { dbUserQueryOptions } from "@/lib/api";
import { currentlyPlayingQueryOptions, setCurrentlyPlaying, stopPlaying, gameActivePlayersQueryOptions, type SessionStatus } from "@/lib/gameSessionsQuery";
import { gameInWishlistQueryOptions, gameWantToPlayCountQueryOptions, addToWishlist, removeFromWishlist, type WishlistResponse } from "@/lib/wantToPlayQuery";
import { type UserReviewsResponse } from "@/lib/reviewsQuery";

import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'
import { createReview } from '@/lib/reviewsQuery'
import { Textarea } from "@/components/ui/textarea";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { se } from "date-fns/locale";

export const Route = createFileRoute('/games/$gameId')({
  component: GameView,
  validateSearch: (search: Record<string, unknown>): { review?: boolean } => {
    return {
      review: search.review === true || search.review === 'true' ? true : undefined,
    }
  },
})

function GameView () {
    const { gameId } = Route.useParams()
    const { review: openReviewForm } = Route.useSearch()
    const navigate = useNavigate()
    const { isPending, error, data } = useQuery
    (getGameByIdQueryOptions(gameId))

    const {data: gameReviews = [], isPending: reviewsLoading} = useQuery
    (getReviewsByGameIdQueryOptions(gameId));

    const {data: loadingCreateReview} = useQuery(loadingCreateReviewQueryOptions);

    // Load more state
    const [visibleCount, setVisibleCount] = useState(4);
    // Maximize review form state - initialize based on URL search param
    const [isFormMaximized, setIsFormMaximized] = useState(openReviewForm ?? false);
    // Switch game dialog state
    const [showSwitchGameDialog, setShowSwitchGameDialog] = useState(false);
    const reviewsPerPage = 4;
    const visibleReviews = gameReviews.slice(0, visibleCount);
    const hasMoreReviews = visibleCount < gameReviews.length;

    // Like mutation with optimistic updates
    const likeMutation = useMutation({
      mutationFn: toggleReviewLike,
      onMutate: async (reviewId: string) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: getReviewsByGameIdQueryOptions(gameId).queryKey });

        // Snapshot the previous value
        const previousReviews = queryClient.getQueryData<GameReview[]>(
          getReviewsByGameIdQueryOptions(gameId).queryKey
        );

        // Optimistically update the reviews (keep order stable until next reload)
        if (previousReviews) {
          const updatedReviews = previousReviews.map((review) => {
            if (review.id === reviewId) {
              const currentLikeCount = Number(review.likeCount);
              return {
                ...review,
                userLiked: !review.userLiked,
                likeCount: review.userLiked ? currentLikeCount - 1 : currentLikeCount + 1,
              };
            }
            return review;
          });

          queryClient.setQueryData(
            getReviewsByGameIdQueryOptions(gameId).queryKey,
            updatedReviews
          );
        }

        return { previousReviews };
      },
      onError: (err, _reviewId, context) => {
        // Rollback on error
        if (context?.previousReviews) {
          queryClient.setQueryData(
            getReviewsByGameIdQueryOptions(gameId).queryKey,
            context.previousReviews
          );
        }
        toast.error(err instanceof Error ? err.message : "Failed to update like");
      },
    });

    const handleLikeClick = (reviewId: string) => {
      if (!dbUserData?.account) {
        toast.error("Please log in to like reviews");
        return;
      }
      likeMutation.mutate(reviewId);
    };

    // Get the current user's database ID for optimistic updates on profile page
    const { data: dbUserData } = useQuery(dbUserQueryOptions);

    // Currently playing state
    const { data: currentlyPlayingData } = useQuery({
      ...currentlyPlayingQueryOptions,
      enabled: !!dbUserData?.account,
    });

    // Count of users currently playing this game
    const { data: activePlayersData, isPending: activePlayersPending } = useQuery(
      gameActivePlayersQueryOptions(gameId)
    );

    // Want to play (wishlist) state
    const { data: wishlistStatus } = useQuery({
      ...gameInWishlistQueryOptions(gameId),
      enabled: !!dbUserData?.account,
    });

    const { data: wantToPlayCountData, isPending: wantToPlayCountPending } = useQuery(
      gameWantToPlayCountQueryOptions(gameId)
    );

    const isInWishlist = wishlistStatus?.inWishlist ?? false;

    // Want to play mutation with optimistic updates
    const wantToPlayMutation = useMutation({
      mutationFn: async () => {
        if (isInWishlist) {
          return removeFromWishlist(gameId);
        } else {
          return addToWishlist(gameId);
        }
      },
      onMutate: async () => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['want-to-play-check', gameId] });
        await queryClient.cancelQueries({ queryKey: ['want-to-play-count', gameId] });
        await queryClient.cancelQueries({ queryKey: ['want-to-play'] });

        // Snapshot the previous values
        const previousStatus = queryClient.getQueryData<{ inWishlist: boolean }>(
          ['want-to-play-check', gameId]
        );
        const previousCount = queryClient.getQueryData<{ count: number }>(
          ['want-to-play-count', gameId]
        );
        const previousWishlist = queryClient.getQueryData<WishlistResponse>(
          ['want-to-play']
        );

        // Optimistically update
        queryClient.setQueryData(['want-to-play-check', gameId], {
          inWishlist: !isInWishlist,
        });
        queryClient.setQueryData(['want-to-play-count', gameId], {
          count: (previousCount?.count ?? 0) + (isInWishlist ? -1 : 1),
        });

        // Update wishlist cache
        if (previousWishlist) {
          if (isInWishlist) {
            // Remove from wishlist
            queryClient.setQueryData(['want-to-play'], {
              wishlist: previousWishlist.wishlist.filter(item => item.gameId !== gameId),
            });
          } else if (data?.game) {
            // Add to wishlist
            queryClient.setQueryData(['want-to-play'], {
              wishlist: [
                {
                  gameId: gameId,
                  createdAt: new Date().toISOString(),
                  gameName: data.game.name,
                  gameCoverUrl: data.game.coverUrl,
                  gameSlug: data.game.slug,
                },
                ...previousWishlist.wishlist,
              ],
            });
          }
        }

        return { previousStatus, previousCount, previousWishlist };
      },
      onError: (err, _, context) => {
        // Rollback on error
        if (context?.previousStatus) {
          queryClient.setQueryData(['want-to-play-check', gameId], context.previousStatus);
        }
        if (context?.previousCount) {
          queryClient.setQueryData(['want-to-play-count', gameId], context.previousCount);
        }
        if (context?.previousWishlist) {
          queryClient.setQueryData(['want-to-play'], context.previousWishlist);
        }
        toast.error(err instanceof Error ? err.message : "Failed to update wishlist");
      },
    });

    const handleWantClick = () => {
      if (!dbUserData?.account) {
        toast.error("Please log in to add games to your wishlist");
        return;
      }
      wantToPlayMutation.mutate();
    };

    const isCurrentlyPlayingThisGame = currentlyPlayingData?.game?.id === gameId;

    // Set currently playing mutation
    const setPlayingMutation = useMutation({
      mutationFn: setCurrentlyPlaying,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['currently-playing'] });
        queryClient.invalidateQueries({ queryKey: ['game-active-players'] });
        toast.success('Now playing!');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to set currently playing');
      },
    });

    // Stop playing mutation (for stopping current game without switching)
    const stopPlayingMutation = useMutation({
      mutationFn: stopPlaying,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['currently-playing'] });
        queryClient.invalidateQueries({ queryKey: ['game-active-players'] });
        toast.success('Stopped playing');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to stop playing');
      },
    });

    // Switch game mutation (stop old game then start new one)
    const switchGameMutation = useMutation({
      mutationFn: async (status: SessionStatus) => {
        await stopPlaying(status);
        return setCurrentlyPlaying(gameId);
      },
      onSuccess: (_, status) => {
        queryClient.invalidateQueries({ queryKey: ['currently-playing'] });
        queryClient.invalidateQueries({ queryKey: ['game-active-players'] });
        queryClient.invalidateQueries({ queryKey: ['play-history'] });
        setShowSwitchGameDialog(false);
        toast.success(status === 'finished' ? 'Game completed! Now playing new game.' : 'Game stashed! Now playing new game.');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to switch games');
      },
    });

    const handleSwitchGame = (status: SessionStatus) => {
      switchGameMutation.mutate(status);
    };

    const isPlayingDifferentGame = currentlyPlayingData?.game && currentlyPlayingData.game.id !== gameId;

    const handlePlayClick = () => {
      if (!dbUserData?.account) {
        toast.error("Please log in to track what you're playing");
        return;
      }
      if (isCurrentlyPlayingThisGame) {
        stopPlayingMutation.mutate(undefined);
      } else if (isPlayingDifferentGame) {
        // User is playing a different game, show dialog to choose what to do with it
        setShowSwitchGameDialog(true);
      } else {
        setPlayingMutation.mutate(gameId);
      }
    };

    if (error) return 'An error has occurred: ' + error.message

    // Average Rating
    const { isPending: isRatingPending, data: avgRating } = useQuery({
      queryKey: ['get-game-rating', gameId],
      queryFn: () => getGameRating(gameId)
    })

const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      rating: '',
      reviewText: '',
      gameId: gameId,
    },
    onSubmit: async ({ value, formApi }) => {
      // Validate rating format before submission
      const ratingStr = String(value.rating);
      const ratingRegex = /^[0-5](\.[0-9])?$/;
      if (!ratingRegex.test(ratingStr)) {
        toast.error("Please select a valid rating (1-5 stars)");
        return;
      }

      const existingGameReviews = await queryClient.ensureQueryData(
        getReviewsByGameIdQueryOptions(gameId)
      );

      toast.loading("Creating review...");
      queryClient.setQueryData(loadingCreateReviewQueryOptions.queryKey, {review: value})
      try{
        const reviewPayload = {
          ...value,
          rating: ratingStr,
        };
        const newReview = await createReview({ value: reviewPayload });

        queryClient.setQueryData(
          getReviewsByGameIdQueryOptions(gameId as string).queryKey,
          [newReview, ...(existingGameReviews || [])]
        );
        setVisibleCount(4);

        const dbUserId = dbUserData?.account?.id;
        if (dbUserId) {
          const existingUserReviewsData = queryClient.getQueryData(
            getReviewsByUserIdQueryOptions(dbUserId).queryKey
          ) as UserReviewsResponse | undefined;

          if (existingUserReviewsData) {
            const newReviewForUserCache = {
              ...newReview,
              ...(data?.game && {
                gameName: data.game.name,
                gameCoverUrl: data.game.coverUrl ?? null,
              }),
            };

            queryClient.setQueryData(
              getReviewsByUserIdQueryOptions(dbUserId).queryKey,
              {
                ...existingUserReviewsData,
                reviews: [newReviewForUserCache, ...existingUserReviewsData.reviews],
                totalCount: existingUserReviewsData.totalCount + 1,
              }
            );
          }
        }

        toast.dismiss();
        toast.success(`Review has been added: ID: ${newReview.id}`)
        setIsFormMaximized(false);
        formApi.reset();
        // Clear the review search param if present to prevent form reopening on reload
        if (openReviewForm) {
          navigate({ to: '/games/$gameId', params: { gameId }, replace: true });
        }
      } catch(error){
        toast.error("Failed to create new review")
      } finally{
        queryClient.setQueryData(loadingCreateReviewQueryOptions.queryKey, {})
      }
    },
  })

    return (
        <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-rose-50 text-stone-900 selection:bg-orange-300/30">
            <Navbar />

            {isPending ? (
              <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-6 max-w-screen-2xl">
                <GameDetailSkeleton />
              </div>
            ) : (
            <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-6 max-w-screen-2xl">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Left Column: Poster & Actions */}
                    <div className="flex flex-col items-center lg:items-start space-y-4 shrink-0">
                        <div className="border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]">
                          <Poster game={data.game} size="xl" className="" />
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mt-4">
                            <button
                                onClick={()=>{setIsFormMaximized(true)}}
                                className="flex flex-col items-center justify-center gap-1 bg-white text-stone-900 border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] active:shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] hover:bg-green-100 transition-all p-2"
                            >
                                <Pencil className="w-5 h-5" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Log</span>
                            </button>
                            <button
                                onClick={handleWantClick}
                                disabled={wantToPlayMutation.isPending}
                                className={`flex flex-col items-center justify-center gap-1 text-stone-900 border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] active:shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all p-2 ${
                                    isInWishlist
                                        ? 'bg-amber-400 hover:bg-amber-300'
                                        : 'bg-white hover:bg-amber-100'
                                } ${wantToPlayMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <CalendarHeart className={`w-5 h-5 ${isInWishlist ? 'stroke-[3.5]' : ''}`} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Want</span>
                            </button>

                            <button
                                onClick={handlePlayClick}
                                disabled={setPlayingMutation.isPending || stopPlayingMutation.isPending}
                                className={`flex flex-col items-center justify-center gap-1 text-stone-900 border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] active:shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all p-2 ${
                                    isCurrentlyPlayingThisGame
                                        ? 'bg-green-400 hover:bg-green-300'
                                        : 'bg-white hover:bg-amber-100'
                                } ${(setPlayingMutation.isPending || stopPlayingMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <ConciergeBell className="w-5 h-5" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">
                                    {isCurrentlyPlayingThisGame ? 'Playing' : 'Playing?'}
                                </span>
                            </button>
                        </div>

                        <div className="w-full pt-4 border-t-4 border-stone-900 flex gap-4 justify-center lg:justify-start">
                            <div className="text-center lg:text-left">
                                <div className="text-xs uppercase tracking-widest mb-1 text-stone-600 font-medium">Reviews</div>
                                <div className="text-2xl font-bold text-stone-900">{reviewsLoading ? '—' : gameReviews.length}</div>
                            </div>
                            <div className="text-center lg:text-left">
                                <div className="text-xs uppercase tracking-widest mb-1 text-stone-600 font-medium">Wishlisted</div>
                                <div className="text-2xl font-bold text-amber-600">{wantToPlayCountPending ? '—' : wantToPlayCountData?.count ?? 0}</div>
                            </div>
                            <div className="text-center lg:text-left">
                                <div className="text-xs uppercase tracking-widest mb-1 text-stone-600 font-medium">Playing</div>
                                <div className="text-2xl font-bold text-green-600">{activePlayersPending ? '—' : activePlayersData?.count ?? 0}</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Info & Reviews */}
                    <div className="flex-1 pt-0 text-center lg:text-left min-w-0">
                        <div className="mb-6">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 mb-2 font-serif">{data.game?.name}</h1>
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 text-sm overflow-hidden">
                                <span className="bg-amber-200 px-2 sm:px-3 py-1 font-semibold border-2 border-stone-900 text-xs sm:text-sm shrink-0">
                                    {new Date(data.game.releaseDate).getFullYear()}
                                </span>
                                <span className="bg-sky-200 px-2 sm:px-3 py-1 text-xs uppercase border-2 border-stone-900 font-medium truncate max-w-[120px] sm:max-w-none">{data.game?.name?.split(':')[0]}</span>
                                <span className="bg-green-200 px-2 sm:px-3 py-1 text-xs uppercase border-2 border-stone-900 font-medium shrink-0">IGDB: {Math.round(data.game.igdbRating)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                            {/* Left: Synopsis & Reviews */}
                            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                                <div className="bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] p-4 sm:p-6">
                                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest border-b-2 border-stone-900 pb-2 mb-4">Synopsis</h3>
                                    <p className="text-stone-700 leading-relaxed">
                                      {data.game?.summary}
                                    </p>
                                </div>

                                <div className="bg-blue-400 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] p-4 sm:p-6">
                                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest border-b-2 border-stone-900 pb-2 mb-4">
                                        Top Reviews
                                    </h3>
                                    {loadingCreateReview?.review &&
                                        <div className="space-y-4 mb-4">
                                                <div className="bg-orange-50 border-4 border-stone-900 p-3 sm:p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-6 h-6 rounded-full bg-linear-to-tr from-orange-50 to-amber-500 border-2 border-stone-900 shrink-0" />
                                                            <span className="text-sm font-bold text-stone-900">You</span>
                                                        </div>
                                                        <StarRating rating={Number(loadingCreateReview?.review.rating)} size="sm" />
                                                    </div>
                                                    <p className="text-stone-700 text-sm p-2">"{loadingCreateReview.review.reviewText}"</p>
                                                </div>
                                        </div>
                                    }
                                    {reviewsLoading ? (
                                        <ReviewsSkeleton />
                                    ) : gameReviews?.length > 0 ? (
                                        <>
                                        <div className="space-y-4">
                                            {visibleReviews.map((r: GameReview) => {
                                                const initials = r.username
                                                    ? r.username.slice(0, 2).toUpperCase()
                                                    : r.displayName
                                                        ? r.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                                        : '?';
                                                return (
                                                <div key={r.id} className="bg-stone-50 border-4 border-stone-900 p-3 sm:p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                        <Link
                                                            to={r.userId === dbUserData?.account?.id ? "/profile" : "/users/$userId"}
                                                            params={r.userId === dbUserData?.account?.id ? {} : { userId: r.userId }}
                                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Avatar className="w-6 h-6 border-2 border-stone-900 shrink-0">
                                                                <AvatarImage
                                                                    src={r.avatarUrl
                                                                        ? (r.avatarUrl.startsWith('http') ? r.avatarUrl : `/api/user/avatar/${r.userId}`)
                                                                        : undefined
                                                                    }
                                                                    alt={r.username || 'User'}
                                                                />
                                                                <AvatarFallback className="bg-orange-50 text-stone-900 text-xs font-bold">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-bold text-stone-900 hover:underline truncate">{r.userId === dbUserData?.account?.id ? 'You' : (r.username || r.displayName || 'Anonymous')}</span>
                                                        </Link>

                                                        <StarRating rating={Number(r.rating)} size="sm" />
                                                    </div>
                                                    <p className="text-stone-700 text-sm p-2 text-left">{r.reviewText}</p>
                                                    <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-stone-200">
                                                        <button
                                                            onClick={() => handleLikeClick(r.id)}
                                                            disabled={likeMutation.isPending}
                                                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                                                                r.userLiked
                                                                    ? 'text-orange-400 hover:text-orange-300'
                                                                    : 'text-stone-600 hover:text-orange-300'
                                                            } ${likeMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Heart className={`w-3 h-3 ${r.userLiked ? 'fill-current' : ''}`} />
                                                            <span>{r.likeCount}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                        {/* Load More Button */}
                                        {hasMoreReviews && (
                                            <div className="flex items-center justify-center mt-4 pt-4 border-t-2 border-stone-200">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setVisibleCount(prev => prev + reviewsPerPage)}
                                                    className="px-6 py-2 text-sm"
                                                >
                                                    Load More ({gameReviews.length - visibleCount} remaining)
                                                </Button>
                                            </div>
                                        )}
                                        </>
                                    ) : (
                                        <p className="text-stone-500 text-sm italic">No reviews yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Rating & Review Form */}
                            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                                {/* Average Rating */}
                                <div className="bg-amber-200 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] p-4 sm:p-6 text-center">
                                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-stone-900">Average Rating</h3>
                                    {isRatingPending ? (
                                        <>
                                            <Skeleton className="h-10 w-20 mx-auto mb-2 bg-amber-300" />
                                            <Skeleton className="h-5 w-28 mx-auto bg-amber-300" />
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-4xl font-bold text-stone-900 mb-2">
                                                {avgRating ? Number(avgRating.total).toFixed(1) : "—"}
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <StarRating rating={avgRating ? avgRating.total : 0} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Review Form */}
                                <ReviewFormBox
                                    isMaximized={isFormMaximized}
                                    onMaximize={() => setIsFormMaximized(true)}
                                    onMinimize={() => setIsFormMaximized(false)}
                                    form={form}
                                    dbUserData={dbUserData}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            )}

            {/* Switch Game Dialog */}
            <Dialog open={showSwitchGameDialog} onOpenChange={setShowSwitchGameDialog}>
              <DialogContent className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] rounded-none">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-stone-900">
                    Switch Game
                  </DialogTitle>
                  <DialogDescription className="text-stone-600 mt-2">
                    You're currently playing <span className="font-semibold">{currentlyPlayingData?.game?.name}</span>.
                    {<br/>} {<br/>}
                    How would you like to mark that session before starting <span className="font-semibold">{data?.game?.name}</span>?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-4">
                  <Button
                    onClick={() => handleSwitchGame('finished')}
                    disabled={switchGameMutation.isPending}
                    className="bg-lime-100 hover:bg-lime-200 text-black border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-auto py-3 justify-start"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    <div className="text-left">
                      <div className="font-bold">Finished</div>
                      <div className="text-xs opacity-90">I completed it</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => handleSwitchGame('stashed')}
                    disabled={switchGameMutation.isPending}
                    className="bg-sky-100 hover:bg-sky-200 text-black border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-auto py-3 justify-start"
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    <div className="text-left">
                      <div className="font-bold">Stash for now</div>
                      <div className="text-xs opacity-90">I'll come back to it later maybe</div>
                    </div>
                  </Button>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowSwitchGameDialog(false)}
                    disabled={switchGameMutation.isPending}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
};

export default GameView;

function GameDetailSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Left Column */}
      <div className="flex flex-col items-center lg:items-start space-y-4 shrink-0">
        <div className="border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]">
          <Skeleton className="w-[200px] sm:w-[250px] h-[280px] sm:h-[350px] bg-stone-200" />
        </div>
        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mt-4">
          <Skeleton className="h-14 sm:h-16 bg-stone-200 border-4 border-stone-900" />
          <Skeleton className="h-14 sm:h-16 bg-stone-200 border-4 border-stone-900" />
          <Skeleton className="h-14 sm:h-16 bg-stone-200 border-4 border-stone-900" />
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 pt-0 min-w-0">
        <div className="mb-6">
          <Skeleton className="h-8 sm:h-10 w-3/4 mb-4 bg-stone-200" />
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Skeleton className="h-7 sm:h-8 w-16 sm:w-20 bg-stone-200 border-2 border-stone-900" />
            <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 bg-stone-200 border-2 border-stone-900" />
            <Skeleton className="h-7 sm:h-8 w-24 sm:w-28 bg-stone-200 border-2 border-stone-900" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] p-4 sm:p-6">
              <Skeleton className="h-4 w-24 mb-4 bg-stone-200" />
              <Skeleton className="h-4 w-full mb-2 bg-stone-200" />
              <Skeleton className="h-4 w-full mb-2 bg-stone-200" />
              <Skeleton className="h-4 w-5/6 bg-stone-200" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-24 w-full bg-amber-200 border-4 border-stone-900" />
            <Skeleton className="h-64 w-full bg-orange-200 border-4 border-stone-900" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="bg-stone-50 border-4 border-stone-900 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Skeleton className="w-6 h-6 rounded-full bg-stone-200 shrink-0" />
              <Skeleton className="h-4 w-16 sm:w-20 bg-stone-200" />
            </div>
            <Skeleton className="h-4 w-20 sm:w-24 bg-stone-200" />
          </div>
          <Skeleton className="h-4 w-full mt-2 bg-stone-200" />
          <Skeleton className="h-4 w-3/4 mt-2 bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

interface ReviewFormBoxProps {
  isMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  dbUserData: { account?: { id: string } | null } | undefined;
}

function ReviewFormBox({ isMaximized, onMaximize, onMinimize, form, dbUserData }: ReviewFormBoxProps) {
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isMaximized ? 'opacity-100 z-40' : 'opacity-0 pointer-events-none -z-10'
        }`}
        onClick={onMinimize}
      />

      {/* Form container */}
      <div
        className={`bg-orange-300 text-stone-900 border-4 border-stone-900 transition-all duration-300 ease-out ${
          isMaximized
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] p-6 sm:p-8'
            : 'relative shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] p-4 sm:p-6'
        }`}
      >
        {/* Maximize Button - top right on mobile, outer left edge on desktop */}
        {!isMaximized && (
          <>
            {/* Mobile: top right corner */}
            <button
              onClick={onMaximize}
              className="lg:hidden absolute top-2 right-2 z-10 bg-stone-900 text-white border-2 border-stone-900 p-1.5"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {/* Desktop: outer left edge */}
            <button
              onClick={onMaximize}
              className="hidden lg:flex group absolute top-1/2 -translate-y-1/2 right-full mr-0 z-10 items-center flex-row-reverse"
            >
              <div className="flex items-center flex-row-reverse bg-stone-900 text-white border-2 border-stone-900 transition-all duration-200 ease-out overflow-hidden group-hover:pl-3">
                <div className="p-2">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap max-w-0 group-hover:max-w-[80px] transition-all duration-200 ease-out overflow-hidden">
                  Maximize
                </span>
              </div>
            </button>
          </>
        )}

        {/* Minimize Button - top right */}
        {isMaximized && (
          <button
            onClick={onMinimize}
            className="group absolute top-3 right-3 z-10 flex items-center"
          >
            <div className="flex items-center bg-stone-900 text-white border-2 border-stone-900 transition-all duration-200 ease-out overflow-hidden group-hover:pl-3">
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap max-w-0 group-hover:max-w-[80px] transition-all duration-200 ease-out overflow-hidden">
                Minimize
              </span>
              <div className="p-2">
                <Minimize2 className="w-4 h-4" />
              </div>
            </div>
          </button>
        )}

        <h3 className={`font-bold uppercase tracking-widest border-b-2 border-stone-900 pb-2 mb-4 ${
          isMaximized ? 'text-sm sm:text-base mb-6' : 'text-xs sm:text-sm pt-6 lg:pt-0'
        }`}>Thoughts?</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className={`flex flex-col ${isMaximized ? 'gap-6' : 'gap-4'}`}
        >
          <form.Field
            name="rating"
            validators={{
              onChange: ({ value }: { value: string }) => {
                if (!value || value === '0') {
                  return 'Rating is required'
                }
                return undefined
              }
            }}
            children={(field: any) => (
              <>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={field.name} className={`text-stone-900 font-semibold ${isMaximized ? 'text-sm sm:text-base' : 'text-sm'}`}>Your Rating</Label>
                </div>
                <div className="flex items-center gap-2 mb-2 overflow-x-auto">
                  <StarRating
                    interactive
                    rating={Number(field.state.value) || 0}
                    onValueChange={(rating) => field.handleChange(rating.toString())}
                    size={isMaximized ? "md" : "sm"}
                  />
                </div>
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <p className={`text-rose-700 ${isMaximized ? 'text-xs sm:text-sm' : 'text-xs'}`}>
                    {field.state.meta.errors.map((err: any) =>
                      typeof err === 'string'
                        ? err
                        : err && err.message
                          ? err.message
                          : JSON.stringify(err)
                    ).join(',')}
                  </p>
                )}
              </>
            )}
          />

          <form.Field
            name="reviewText"
            validators={{
              onChange: ({ value }: { value: string }) => {
                if (!value || value.trim() === '') {
                  return 'Review text is required'
                }
                if (value.length > 5000) {
                  return 'Review text must be less than 5000 characters'
                }
                return undefined
              }
            }}
            children={(field: any) => (
              <>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={field.name} className={`text-stone-900 font-semibold ${isMaximized ? 'text-sm sm:text-base' : 'text-sm'}`}>Your Review</Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange((e.target.value))}
                    placeholder="What did you think?"
                    className={`bg-white border-4 border-stone-900 text-stone-900 rounded-none focus:ring-2 focus:ring-stone-900 transition-all duration-300 ${
                      isMaximized ? 'min-h-48 sm:min-h-64' : 'min-h-28 sm:min-h-32 lg:min-h-40'
                    }`}
                  />
                </div>
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <p className={`text-rose-700 ${isMaximized ? 'text-xs sm:text-sm' : 'text-xs'}`}>
                    {field.state.meta.errors.map((err: any) =>
                      typeof err === 'string'
                        ? err
                        : err && err.message
                          ? err.message
                          : JSON.stringify(err)
                    ).join(',')}
                  </p>
                )}
              </>
            )}
          />

          <form.Subscribe
            selector={(state: any) => [state.canSubmit, state.isSubmitting, state.values]}
            children={([canSubmit, isSubmitting, values]: [boolean, boolean, any]) => {
              const isLoggedIn = !!dbUserData?.account;
              const reviewValues = typeof values === "object" && values !== null && "rating" in values && "reviewText" in values ? values as { rating: string; reviewText: string } : { rating: '', reviewText: '' };
              const hasRating = reviewValues.rating && reviewValues.rating !== '0';
              const hasReviewText = reviewValues.reviewText && reviewValues.reviewText.trim() !== '';
              const canSubmitForm = canSubmit && isLoggedIn && hasRating && hasReviewText;

              return (
                <>
                  {!isLoggedIn && (
                    <p className={`text-stone-700 text-center ${isMaximized ? 'text-sm' : 'text-xs'}`}>
                      <a href="/api/login" className="underline font-bold">Log in</a> to submit a review
                    </p>
                  )}
                  <div className={`flex gap-2 ${isMaximized ? 'flex-col sm:flex-row gap-3' : 'flex-col'}`}>
                    <Button type="submit" variant="outline" disabled={(!canSubmitForm) || !!isSubmitting} className={`bg-white text-stone-900 hover:bg-stone-50 ${isMaximized ? 'flex-1 py-3' : 'w-full'}`}>
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                    <Button
                      type="reset"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault()
                        form.reset()
                      }}
                      className={`text-stone-700 hover:text-stone-900 ${isMaximized ? 'flex-1 py-3' : 'w-full'}`}
                    >
                      Reset
                    </Button>
                  </div>
                </>
              )
            }}
          />
        </form>
      </div>
    </>
  )
}
