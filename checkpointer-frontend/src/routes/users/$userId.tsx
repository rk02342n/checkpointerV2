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
      className="block bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all p-4"
    >
      <div className="flex gap-4">
        {/* Game Cover */}
        <div className="shrink-0">
          {gameCoverUrl ? (
            <img
              src={gameCoverUrl}
              alt={gameName}
              className="w-16 h-20 object-cover border-2 border-stone-900"
            />
          ) : (
            <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-stone-500" />
            </div>
          )}
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-stone-900 font-bold truncate" title={gameName}>
                {gameName}
              </h4>
              {review.createdAt && (
                <div className="flex items-center gap-1 text-stone-600 text-xs mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              )}
            </div>
            <StarRating rating={review.rating} size="sm" />
          </div>

          {/* Review Text */}
          {review.reviewText && (
            <p className="text-stone-700 text-sm line-clamp-3 flex-1">
              "{review.reviewText}"
            </p>
          )}

          {/* Actions: Like */}
          <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t-2 border-stone-200">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onLike(String(review.id))
              }}
              disabled={isLiking}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                review.userLiked
                  ? 'text-orange-100 hover:text-orange-100'
                  : 'text-stone-600 hover:text-orange-300'
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="bg-rose-100 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 text-center">
            <Gamepad2 className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">User Not Found</h2>
            <p className="text-stone-600">This user profile doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProfilePending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 text-stone-900 selection:bg-orange-300/30">
      <Navbar />

      <div className="container mx-auto max-w-4xl px-6 py-8">
        {/* Profile Header */}
        <div className="bg-orange-100 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <Avatar className="w-24 h-24 border-4 border-stone-900">
              <AvatarImage
                src={user?.avatarUrl ? `/api/user/avatar/${user.id}` : undefined}
                alt={user?.displayName || user?.username || 'User'}
              />
              <AvatarFallback className="bg-orange-100 text-stone-900 text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-stone-900">
                {user?.displayName || user?.username || 'Anonymous User'}
              </h1>
              {user?.username && (
                <p className="text-stone-700 text-sm font-medium mt-1">@{user.username}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className="bg-white border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] px-4 py-2">
                  <div className="text-2xl font-bold text-stone-900">{totalReviewCount}</div>
                  <div className="text-xs uppercase tracking-wide text-stone-600 font-medium">Reviews</div>
                </div>
                <div className="bg-white border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] px-4 py-2">
                  <div className="text-2xl font-bold text-stone-900">
                    <Gamepad2 className="w-6 h-6 inline" />
                  </div>
                  <div className="text-xs uppercase tracking-wide text-stone-600 text-center font-medium">Gamer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 border-stone-900 pb-2 mb-4">
            Reviews
          </h2>

          {reviewsPending ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-stone-50 border-4 border-stone-900 p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-stone-200" />
                      <div className="h-4 w-full bg-stone-200" />
                      <div className="h-4 w-2/3 bg-stone-200" />
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
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gamepad2 className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <p className="text-stone-900 font-bold mb-2">No reviews yet</p>
              <p className="text-stone-600 text-sm">
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
      <div className="bg-orange-100 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full bg-orange-300 border-4 border-stone-900" />
          <div className="flex-1 text-center md:text-left">
            <Skeleton className="h-9 w-48 mb-2 mx-auto md:mx-0 bg-orange-300" />
            <Skeleton className="h-5 w-32 mx-auto md:mx-0 bg-orange-300" />
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
              <Skeleton className="h-16 w-24 bg-white border-4 border-stone-900" />
              <Skeleton className="h-16 w-24 bg-white border-4 border-stone-900" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <Skeleton className="h-5 w-24 mb-4 bg-stone-200" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-stone-50 border-4 border-stone-900 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-stone-200" />
                  <div className="h-4 w-full bg-stone-200" />
                  <div className="h-4 w-2/3 bg-stone-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
