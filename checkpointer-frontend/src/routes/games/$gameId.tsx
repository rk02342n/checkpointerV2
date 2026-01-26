import { createFileRoute } from "@tanstack/react-router";
import { Poster } from "@/components/Poster";
import { Eye, Clock, Heart } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import Navbar from "@/components/Navbar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGameByIdQueryOptions } from "@/lib/gameQuery";
import { getReviewsByGameIdQueryOptions, getReviewsByUserIdQueryOptions, loadingCreateReviewQueryOptions } from "@/lib/reviewsQuery";
import { dbUserQueryOptions } from "@/lib/api";

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

    // Get the current user's database ID for optimistic updates on profile page
    const { data: dbUserData } = useQuery(dbUserQueryOptions);

    if (error) return 'An error has occurred: ' + error.message

    const activeGame = { id: 1, name: "Elden Ring", releaseDate: '2022', coverUrl: "FromSoftware"}

    const avgRating = 2.5;


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
          const existingUserReviews = queryClient.getQueryData(
            getReviewsByUserIdQueryOptions(dbUserId).queryKey
          ) as Array<unknown> | undefined;

          queryClient.setQueryData(
            getReviewsByUserIdQueryOptions(dbUserId).queryKey,
            [newReview, ...(existingUserReviews || [])]
          );
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
            <div className="container mx-auto mt-10 px-4 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Column: Poster & Actions */}
                    {!isPending && <div className="flex flex-col items-center md:items-start space-y-4 shrink-0">
                        {activeGame && <Poster game={data.game} size="xl" className="shadow-lg rounded-lg outline-2 outline-black" />}
                        
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
                    </div>}

                    {/* Right Column: Info & Reviews */}
                    {!isPending && <div className="flex-1 pt-0 text-center md:text-left">
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
                                    {!isPending && !reviewsLoading && gameReviews?.length > 0 ? 
                                        <div className="space-y-4">
                                            {gameReviews?.slice(0,4).map((r: { id: string | number; rating: number; reviewText: string; userId: string; username: string | null; displayName: string | null; avatarUrl: string | null }) => {
                                                const initials = r.username
                                                    ? r.username.slice(0, 2).toUpperCase()
                                                    : r.displayName
                                                        ? r.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                                        : '?';
                                                return (
                                                <div key={r.id} className="bg-amber-200 rounded border-2 border-black p-4">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="w-6 h-6 border border-black">
                                                                 <AvatarImage src={r.avatarUrl || undefined} alt={r.username || 'User'} />
                                                                <AvatarFallback className="bg-lime-400 text-black text-xs font-bold">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-bold text-black">{r.username || 'You'}</span>
                                                        </div>

                                                        <StarRating rating={r.rating} />
                                                    </div>
                                                    <p className="text-black text-sm font-sans p-2">"{r.reviewText}"</p>
                                                </div>
                                            )})}
                                        </div>
                                     :
                                        <p className="text-black text-sm italic">No reviews yet</p>
                                    }
                                </div>
                            </div>
                        </div>
                        
                    </div>}
                </div>
            </div>

            {/* Backdrop */}
            <div className=" container flex h-84 gap-4 relative overflow-hidden mask-image-b items-end justify-end mt-8">
                <div className={`absolute inset-0 bg-indigo-600 text-white opacity-100 w-2/3 rounded-xl border-2 border-black overflow-y-scroll`}>
                 <div className='m-auto p-4 max-w-lg'>
             {isPending ? <h2>no</h2> : <h2 className="text-md tracking-tight p-4 text-left">Write a review for  <span className="font-bold">{data.game?.name}</span></h2>}
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
                    // validators={{
                    //   onChange: createReviewSchema.shape.rating
                    // }}
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
                    // validators={{
                    //   onChange: reviewFieldValidators.reviewText
                    // }}
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
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                  children={([canSubmit, isSubmitting]) => (
                    <>
                    <div className='flex flex-row gap-2 justify-center'>
                      <Button type="submit" disabled={!canSubmit}>
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
                  )}
                /> 
            </form>
          </div>
                </div>
                
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

                    {isPending ? <h1>PENDINGG</h1> : <div className="mt-6 pt-6 border-t border-black text-center flex flex-col justify-center items-center">
                        <div className="text-3xl font-bold text-black mb-1">
                            {gameReviews?.length > 0 ? avgRating.toFixed(1) : "4.2"}
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <StarRating rating={gameReviews?.length > 0 ? avgRating : 4} />
                        </div>
                        <div className="text-xs text-black mt-2">Average Rating</div>
                    </div>}
                </div>
            </div>
        </div>
    );
};

export default GameView;

