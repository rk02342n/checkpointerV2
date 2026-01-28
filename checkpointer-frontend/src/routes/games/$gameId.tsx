import { createFileRoute, Link } from "@tanstack/react-router";
import { Poster } from "@/components/Poster";
import { Eye, Clock, Heart } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import Navbar from "@/components/Navbar";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getGameByIdQueryOptions, getGameRating } from "@/lib/gameQuery";
import { getReviewsByGameIdQueryOptions, getReviewsByUserIdQueryOptions, loadingCreateReviewQueryOptions, toggleReviewLike, type GameReview } from "@/lib/reviewsQuery";
import { dbUserQueryOptions } from "@/lib/api";
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

export const Route = createFileRoute('/games/$gameId')({
  component: GameView,
})

function GameView () {
    const { gameId } = Route.useParams()
    const { isPending, error, data } = useQuery
    (getGameByIdQueryOptions(gameId))

    const {data: gameReviews = [], isPending: reviewsLoading} = useQuery
    (getReviewsByGameIdQueryOptions(gameId));

    const {data: loadingCreateReview} = useQuery(loadingCreateReviewQueryOptions);

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

    if (error) return 'An error has occurred: ' + error.message

    // Average Rating
    const { isPending: isRatingPending, data: avgRating } = useQuery({
      queryKey: ['get-game-rating', gameId],
      queryFn: () => getGameRating(gameId)
    })

const queryClient = useQueryClient();
// const initials = `${dbUserData.given_name?.[0] || ''}${dbUserData.family_name?.[0] || ''}`.toUpperCase()
  const form = useForm({
    defaultValues: {
      rating: '',
      reviewText: '',
      gameId: gameId,
    },
    onSubmit: async ({ value }) => {
      const existingGameReviews = await queryClient.ensureQueryData(
        getReviewsByGameIdQueryOptions(gameId)
      ); // grab the existing reviews locally or from server if not on memory

      // Loading state
      toast.loading("Creating review...");
      queryClient.setQueryData(loadingCreateReviewQueryOptions.queryKey, {review: value})
      try{
        const newReview = await createReview({ value });

        // Update game reviews cache (existing behavior)
        queryClient.setQueryData(
          getReviewsByGameIdQueryOptions(gameId as string).queryKey,
          [newReview, ...(existingGameReviews || [])].slice(0, 4)
        );

        // Also update user's reviews cache for profile page optimistic update
        const dbUserId = dbUserData?.account?.id;
        if (dbUserId) {
          // Use getQueryData (not ensureQueryData) to avoid fetching from server
          // since the server response would already include the new review, causing duplicates
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

        // success state
        toast.dismiss();
        toast.success(`Review has been added: ID: ${newReview.id}`)
      } catch(error){
        // handle error state
        toast.error("Failed to create new review")
      } finally{
        queryClient.setQueryData(loadingCreateReviewQueryOptions.queryKey, {})
      }
    },
  })
  
    return (
        <div className="w-fit m-auto h-full duration-300 bg-amber-400 p-6 rounded-xl border-2 border-black [bg:url(assets/noise.svg)]">
            
            <Navbar />
            {isPending ? (
              <GameDetailSkeleton />
            ) : (
            <div className="container mx-auto mt-10 px-4 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Column: Poster & Actions */}
                    <div className="flex flex-col items-center md:items-start space-y-4 shrink-0">
                        <Poster game={data.game} size="xl" className="shadow-lg rounded-lg outline-2 outline-black" />
                        
                        <div className="grid grid-cols-3 gap-2 w-full max-w-[250px] mt-4">
                            <button
                                onClick={()=>{}}
                                className="flex flex-col items-center justify-center gap-1 rounded bg-white text-black hover:bg-green-600 hover:text-amber-400 active:bg-green-800 transition-colors p-2"
                            >
                                <Eye className="w-5 h-5" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Log</span>
                            </button>

                            <button 
                                onClick={() => {}}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded bg-white transition-colors hover:text-amber-400 hover:bg-indigo-500 active:text-amber-500 active:bg-indigo-800`}
                            >
                                <Clock className="w-5 h-5" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Watch</span>
                            </button>

                            <button 
                                onClick={() => {}}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded bg-white transition-colors hover:text-amber-400 hover:bg-red-500 active:text-red-500 active:bg-red-800`}
                            >
                                <Heart className="w-5 h-5" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Like</span>
                            </button>
                        </div>

                        <div className="w-full pt-4 border-t border-zinc-800 text-center md:text-left">
                            <div className="text-xs uppercase tracking-widest mb-1 text-black">Total Logs</div>
                            <div className="text-2xl mb-4 font-serif text-black">{1240}</div>
                        </div>
                    </div>

                    {/* Right Column: Info & Reviews */}
                    <div className="flex-1 pt-0 text-center md:text-left">
                        <div className="mb-8">
                            <h1 className="text-4xl font-black text-black mb-2 font-serif tracking-tight">{data.game?.name}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-black text-sm">
                                <span className="font-bold">
                                    {new Date(data.game.releaseDate).getFullYear()}
                                </span>
                                <span>•</span>
                                <span className="px-2 py-0.5 border border-zinc-700 rounded text-black text-xs uppercase bg-sky-300">{data.game?.name}</span>
                                <span>•</span>
                                <span className="bg-lime-400 px-2 py-0.5 border border-zinc-700 rounded text-black text-xs uppercase">IGDB Rating: {data.game.igdbRating}</span>
                                
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-8">
                                <div className="prose prose-invert">
                                    <h3 className="text-sm font-bold uppercase tracking-widest border-b text-black border-zinc-800 pb-2 mb-4">Synopsis</h3>
                                    <p className="text-black leading-relaxed">
                                      {data.game?.summary}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-black text-sm font-bold uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                                        Friend Reviews
                                    </h3>
                                    {loadingCreateReview?.review &&
                                        <div className="space-y-4 mb-4">
                                                <div className="bg-amber-200 rounded border-2 border-black p-4">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="w-6 h-6 rounded-full bg-linear-to-tr from-green-400 to-blue-500" />
                                                        <span className="text-sm font-bold text-zinc-300">You</span>
                                                        <StarRating rating={Number(loadingCreateReview?.review.rating)} />
                                                    </div>
                                                    <p className="text-black text-sm font-sans p-2">"{loadingCreateReview.review.reviewText}"</p>
                                                </div>
                                        </div>
                                    }
                                    {reviewsLoading ? (
                                        <ReviewsSkeleton />
                                    ) : gameReviews?.length > 0 ? (
                                        <div className="space-y-4">
                                            {gameReviews?.slice(0,4).map((r: GameReview) => {
                                                const initials = r.username
                                                    ? r.username.slice(0, 2).toUpperCase()
                                                    : r.displayName
                                                        ? r.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                                        : '?';
                                                return (
                                                <div key={r.id} className="bg-amber-200 rounded border-2 border-black p-4">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <Link
                                                            to={r.userId === dbUserData?.account?.id ? "/profile" : "/users/$userId"}
                                                            params={r.userId === dbUserData?.account?.id ? {} : { userId: r.userId }}
                                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Avatar className="w-6 h-6 border border-black">
                                                                <AvatarImage
                                                                    src={r.avatarUrl
                                                                        ? (r.avatarUrl.startsWith('http') ? r.avatarUrl : `/api/user/avatar/${r.userId}`)
                                                                        : undefined
                                                                    }
                                                                    alt={r.username || 'User'}
                                                                />
                                                                <AvatarFallback className="bg-lime-400 text-black text-xs font-bold">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-bold text-black hover:underline">{r.userId === dbUserData?.account?.id ? 'You' : (r.username || r.displayName || 'Anonymous')}</span>
                                                        </Link>

                                                        <StarRating rating={Number(r.rating)} />
                                                    </div>
                                                    <p className="text-black text-sm font-sans p-2">"{r.reviewText}"</p>
                                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-300">
                                                        <button
                                                            onClick={() => handleLikeClick(r.id)}
                                                            disabled={likeMutation.isPending}
                                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                                r.userLiked
                                                                    ? ' text-teal-600 hover:text-teal-300'
                                                                    : ' text-black hover:text-teal-400'
                                                            } ${likeMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Heart className={`w-3 h-3 ${r.userLiked ? 'fill-current' : ''}`} />
                                                            <span>{r.likeCount}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    ) : (
                                        <p className="text-black text-sm italic">No reviews yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>
            )}

            {/* Backdrop */}
            <div className=" container flex h-84 gap-4 relative overflow-hidden mask-image-b items-end justify-end mt-8">
                <div className={`absolute inset-0 bg-indigo-600 text-white opacity-100 w-2/3 rounded-xl border-2 border-black overflow-y-scroll`}>
                 <div className='m-auto p-4 max-w-lg'>
             {isPending ? (
                    <div className="p-4">
                      <Skeleton className="h-6 w-48" />
                    </div>
                  ) : (
                    <h2 className="text-md tracking-tight p-4 text-left">Write a review for <span className="font-bold">{data.game?.name}</span></h2>
                  )}
             <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
                className='flex flex-col gap-4'
              >
                  <form.Field
                    name="rating"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value || value === '0') {
                          return 'Rating is required'
                        }
                        return undefined
                      }
                    }}
                    children={(field) => (
                      <>
                        <div className='flex flex-col gap-2'>
                        <Label htmlFor={field.name}>Rating</Label>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <StarRating
                            interactive 
                            rating={Number(field.state.value) || 0}
                            onValueChange={(rating) => field.handleChange(rating.toString())}
                          />
                        </div>
                        <>
                          {field.state.meta.isTouched && !field.state.meta.isValid ? (
                            <p className='text-red-600 text-sm'>
                            {field.state.meta.errors.map((err: any) => 
                              typeof err === 'string'
                                ? err
                                : err && err.message 
                                  ? err.message 
                                  : JSON.stringify(err)
                            ).join(',')}
                          </p>
                          ) : null}
                          {field.state.meta.isValidating ? 'Validating...' : null}
                        </>
                      </>
                    )}
                  />

                <form.Field
                    name="reviewText"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value || value.trim() === '') {
                          return 'Review text is required'
                        }
                        if (value.length > 5000) {
                          return 'Review text must be less than 5000 characters'
                        }
                        return undefined
                      }
                    }}
                    children={(field) => (
                      <>
                      <div className='flex flex-col gap-2'>
                      <Label htmlFor={field.name}>Review</Label>
                        <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange((e.target.value))}
                            className="bg-white border-2 border-black text-black"
                        />
                        </div>
                        <>
                          {field.state.meta.isTouched && !field.state.meta.isValid ? (
                            <p className='text-red-600 text-sm'>
                              {field.state.meta.errors.map((err: any) => 
                                typeof err === 'string'
                                  ? err
                                  : err && err.message 
                                    ? err.message 
                                    : JSON.stringify(err)
                              ).join(',')}
                            </p>
                          ) : null}
                          {field.state.meta.isValidating ? 'Validating...' : null}
                        </>
                      </>
                    )}
                  />
                  <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting, state.values]}
                  children={([canSubmit, isSubmitting, values]) => {
                    const isLoggedIn = !!dbUserData?.account;
                    const reviewValues = typeof values === "object" && values !== null && "rating" in values && "reviewText" in values ? values as { rating: string; reviewText: string } : { rating: '', reviewText: '' };
                    const hasRating = reviewValues.rating && reviewValues.rating !== '0';
                    const hasReviewText = reviewValues.reviewText && reviewValues.reviewText.trim() !== '';
                    const canSubmitForm = canSubmit && isLoggedIn && hasRating && hasReviewText;

                    return (
                      <>
                        {!isLoggedIn && (
                          <p className="text-amber-200 text-sm text-center mb-2">
                            Please <a href="/api/login" className="underline font-bold">log in</a> to submit a review
                          </p>
                        )}
                        <div className='flex flex-row gap-2 justify-center'>
                          <Button type="submit" disabled={(!canSubmitForm) || !!isSubmitting}>
                            {isSubmitting ? '...' : 'Submit'}
                          </Button>
                          <Button
                            type="reset"
                            onClick={(e) => {
                              e.preventDefault()
                              form.reset()
                            }}
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
                </div>
                
                {isRatingPending ? (
                  <div className="bg-orange-400 rounded-xl p-6 h-full w-13/40 border-zinc-800 border-2 relative z-10">
                    <Skeleton className="h-4 w-32 mb-4" />
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map(stars => (
                        <div key={stars} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-zinc-500">{stars}</span>
                          <Skeleton className="flex-1 h-2 rounded-full" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-black text-center flex flex-col justify-center items-center">
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-4 w-24 mb-3" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ) : (
                <div className="bg-orange-400 rounded-xl p-6 h-full w-13/40 border-zinc-800 border-2 relative z-10">
                    <h3 className="text-black text-xs font-bold uppercase tracking-widest mb-4">Rating Distribution</h3>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map(stars => (
                            <div key={stars} className="flex items-center gap-2 text-xs">
                                <span className="w-3 text-zinc-500">{stars}</span>
                                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-green-600" 
                                        style={{ width: `${Math.random() * 80 + 10}%` }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {isPending ? (
                      <div className="mt-6 pt-6 border-t border-black text-center flex flex-col justify-center items-center">
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-4 w-24 mb-3" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ) : (
                    <div className="mt-6 pt-6 border-t border-black text-center flex flex-col justify-center items-center">
                        <div className="text-3xl font-bold text-black mb-1">
                            {!isRatingPending && avgRating ? Number(avgRating.total).toFixed(2) : "4.2"}
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <StarRating rating={!isRatingPending && avgRating ? avgRating.total : 4} />
                        </div>
                        <div className="text-xs text-black mt-2">Average Rating</div>
                    </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default GameView;

function GameDetailSkeleton() {
  return (
    <div className="container mx-auto mt-10 px-4 relative z-10 w-screen">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Poster & Actions Skeleton */}
        <div className="flex flex-col items-center md:items-start space-y-4 shrink-0">
          <Skeleton className="w-[250px] h-[350px] rounded-lg" />

          <div className="grid grid-cols-3 gap-2 w-full max-w-[250px] mt-4">
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
          </div>

          <div className="w-full pt-4 border-t border-zinc-800 text-center md:text-left">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Right Column: Info & Reviews Skeleton */}
        <div className="flex-1 pt-0 text-center md:text-left">
          <div className="mb-8">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-5 w-32 rounded" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {/* Synopsis Skeleton */}
              <div>
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Reviews Skeleton */}
              <div>
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-amber-200 rounded border-2 border-black p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-6 h-6 rounded-full" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
        <div key={i} className="bg-amber-200 rounded border-2 border-black p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </div>
      ))}
    </div>
  )
}
