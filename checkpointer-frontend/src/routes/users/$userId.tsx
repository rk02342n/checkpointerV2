import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { publicUserProfileQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getReviewsByUserIdInfiniteOptions, toggleReviewLike } from '@/lib/reviewsQuery'
import { Gamepad2, Calendar, Heart } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/users/$userId')({
  component: PublicProfile,
})

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/StarRating'
import Navbar from '@/components/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

type Review = {
  id: string | number
  gameId: string
  userId: string
  rating: number
  reviewText: string
  createdAt?: string
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  gameName?: string | null
  gameCoverUrl?: string | null
  likeCount: number
  userLiked: boolean
}

function ReviewCard({ review, onLike, isLiking }: { review: Review, onLike: (id: string) => void, isLiking: boolean }) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const gameName = review.gameName || 'Unknown Game'
  const gameCoverUrl = review.gameCoverUrl

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: review.gameId }}
      className="block bg-amber-200 rounded-xl border-2 border-black p-4 hover:bg-amber-300 transition-colors cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Game Cover */}
        <div className="shrink-0">
          {gameCoverUrl ? (
            <img
              src={gameCoverUrl}
              alt={gameName}
              className="w-16 h-20 object-cover rounded-lg border border-black"
            />
          ) : (
            <div className="w-16 h-20 bg-zinc-200 rounded-lg border border-black flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-zinc-500" />
            </div>
          )}
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-black font-bold font-serif truncate" title={gameName}>
                {gameName}
              </h4>
              {review.createdAt && (
                <div className="flex items-center gap-1 text-zinc-600 text-xs mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              )}
            </div>
            <StarRating rating={review.rating} size="sm" />
          </div>

          {/* Review Text */}
          {review.reviewText && (
            <p className="text-black text-sm font-sans line-clamp-3 flex-1">
              "{review.reviewText}"
            </p>
          )}

          {/* Actions: Like */}
          <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-amber-300">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onLike(String(review.id))
              }}
              disabled={isLiking}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                review.userLiked
                  ? ' text-teal-600 hover:text-teal-400'
                  : ' text-black hover:text-teal-400'
              } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`w-3 h-3 ${review.userLiked ? 'fill-current' : ''}`} />
              <span>{review.likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}

function PublicProfile() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()

  const { isPending: isProfilePending, data: profileData, error: profileError } = useQuery(publicUserProfileQueryOptions(userId))
  const { data: dbUserData } = useQuery(dbUserQueryOptions)

  // Get user's reviews
  const {
    data: reviewsData,
    isPending: reviewsPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    ...getReviewsByUserIdInfiniteOptions(userId),
    enabled: !!userId
  })

  // Flatten all pages into a single array of reviews
  const userReviews = reviewsData?.pages.flatMap(page => page.reviews) ?? []
  // Get total count from the first page
  const totalReviewCount = reviewsData?.pages[0]?.totalCount ?? 0

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: toggleReviewLike,
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['get-reviews-user', userId] })

      const previousReviews = queryClient.getQueryData(['get-reviews-user', userId])

      queryClient.setQueryData(['get-reviews-user', userId], (old: typeof reviewsData) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            reviews: page.reviews.map((review: Review) => {
              if (String(review.id) === reviewId) {
                const currentLikeCount = Number(review.likeCount)
                return {
                  ...review,
                  userLiked: !review.userLiked,
                  likeCount: review.userLiked ? currentLikeCount - 1 : currentLikeCount + 1,
                }
              }
              return review
            })
          }))
        }
      })

      return { previousReviews }
    },
    onError: (err, _reviewId, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(['get-reviews-user', userId], context.previousReviews)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update like')
    },
  })

  const handleLikeReview = (reviewId: string) => {
    if (!dbUserData?.account) {
      toast.error("Please log in to like reviews")
      return
    }
    likeMutation.mutate(reviewId)
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-amber-400 p-6 [background:url(assets/noise.svg)]">
        <Navbar />
        <div className="container mx-auto max-w-4xl mt-6">
          <div className="bg-rose-200 border-2 border-black rounded-xl p-8 text-center">
            <Gamepad2 className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-black mb-2">User Not Found</h2>
            <p className="text-zinc-700">This user profile doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProfilePending) {
    return (
      <div className="min-h-screen bg-amber-400 p-6 [background:url(assets/noise.svg)]">
        <Navbar />
        <div className="container mx-auto max-w-4xl mt-6">
          <ProfileSkeleton />
        </div>
      </div>
    )
  }

  const user = profileData
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.displayName
      ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '?'

  return (
    <div className="min-h-screen bg-amber-400 p-6 [background:url(assets/noise.svg)]">
      <Navbar />

      <div className="container mx-auto max-w-4xl mt-6">
        {/* Profile Header */}
        <div className="bg-sky-300 border-2 border-black rounded-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <Avatar className="w-24 h-24 border-4 border-black">
              <AvatarImage
                src={user?.avatarUrl ? `/api/user/avatar/${user.id}` : undefined}
                alt={user?.displayName || user?.username || 'User'}
              />
              <AvatarFallback className="bg-lime-400 text-black text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-black text-black font-serif tracking-tight">
                {user?.displayName || user?.username || 'Anonymous User'}
              </h1>
              {user?.username && (
                <p className="text-zinc-700 text-sm font-medium mt-1">@{user.username}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className="bg-white border-2 border-black rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-black font-serif">{totalReviewCount}</div>
                  <div className="text-xs uppercase tracking-widest text-zinc-600">Reviews</div>
                </div>
                <div className="bg-white border-2 border-black rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-black font-serif">
                    <Gamepad2 className="w-6 h-6 inline" />
                  </div>
                  <div className="text-xs uppercase tracking-widest text-zinc-600 text-center">Gamer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-[rgb(255,220,159)] border-2 border-black rounded-xl p-6">
          <h2 className="text-black text-sm font-bold uppercase tracking-widest border-b border-black pb-2 mb-4">
            Reviews
          </h2>

          {reviewsPending ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-amber-200 rounded-xl border-2 border-black p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-16 h-20 bg-zinc-300 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-zinc-300 rounded" />
                      <div className="h-4 w-full bg-zinc-300 rounded" />
                      <div className="h-4 w-2/3 bg-zinc-300 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : userReviews.length > 0 ? (
            <div className="space-y-4">
              {userReviews.map((review: Review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onLike={handleLikeReview}
                  isLiking={likeMutation.isPending && likeMutation.variables === String(review.id)}
                />
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="bg-sky-400 hover:bg-sky-500 text-black border-2 border-black font-bold"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gamepad2 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <p className="text-black font-bold mb-2">No reviews yet</p>
              <p className="text-zinc-600 text-sm">
                This user hasn't written any reviews yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <div className="bg-sky-300 border-2 border-black rounded-xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 text-center md:text-left">
            <Skeleton className="h-9 w-48 mb-2 mx-auto md:mx-0" />
            <Skeleton className="h-5 w-32 mx-auto md:mx-0" />
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
              <Skeleton className="h-16 w-24 rounded-lg" />
              <Skeleton className="h-16 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[rgb(255,220,159)] border-2 border-black rounded-xl p-6">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-amber-200 rounded-xl border-2 border-black p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-20 bg-zinc-300 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-zinc-300 rounded" />
                  <div className="h-4 w-full bg-zinc-300 rounded" />
                  <div className="h-4 w-2/3 bg-zinc-300 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
