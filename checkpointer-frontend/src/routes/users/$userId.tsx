import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicUserProfileQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getAllReviewsByUserIdQueryOptions, toggleReviewLike, type UserReviewsResponse } from '@/lib/reviewsQuery'
import { userCurrentlyPlayingQueryOptions, playHistoryQueryOptions } from '@/lib/gameSessionsQuery'
import { userWantToPlayQueryOptions } from '@/lib/wantToPlayQuery'
import { Gamepad2, Heart, History, CalendarHeart, ListPlus } from 'lucide-react'
import { toast } from 'sonner'
import { ReviewCard, SessionCard, WishlistCard, type Review } from '@/components/profile/ProfileCards'
import { ListsSection } from '@/components/ListsSection'
import { userGameListsQueryOptions } from '@/lib/gameListsQuery'

export const Route = createFileRoute('/users/$userId')({
  component: PublicProfile,
})

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

const REVIEWS_PER_PAGE = 10

function PublicProfile() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'reviews' | 'history' | 'wishlist' | 'lists'>('reviews')
  const [displayCount, setDisplayCount] = useState(REVIEWS_PER_PAGE)

  const { isPending: isProfilePending, data: profileData, error: profileError } = useQuery(publicUserProfileQueryOptions(userId))
  const { data: dbUserData } = useQuery(dbUserQueryOptions)

  // Get user's currently playing
  const { data: currentlyPlayingData } = useQuery({
    ...userCurrentlyPlayingQueryOptions(userId),
    enabled: !!userId,
  })

  // Get user's reviews
  const { data: reviewsData, isPending: reviewsPending } = useQuery({
    ...getAllReviewsByUserIdQueryOptions(userId),
    enabled: !!userId
  })

  // Get user's play history
  const { data: playHistoryData, isPending: playHistoryPending } = useQuery({
    ...playHistoryQueryOptions(userId),
    enabled: !!userId
  })

  // Get user's wishlist
  const { data: wishlistData, isPending: wishlistPending } = useQuery({
    ...userWantToPlayQueryOptions(userId),
    enabled: !!userId
  })

  // Get user's public game lists
  const { data: gameListsData } = useQuery({
    ...userGameListsQueryOptions(userId),
    enabled: !!userId
  })

  const userReviews = reviewsData?.reviews ?? []
  const totalReviewCount = reviewsData?.totalCount ?? 0
  const playSessions = playHistoryData?.sessions ?? []
  const gameLists = gameListsData?.lists ?? []
  const wishlistItems = wishlistData?.wishlist ?? []

  // Client-side pagination for reviews
  const displayedReviews = useMemo(() => userReviews.slice(0, displayCount), [userReviews, displayCount])
  const hasMoreReviews = displayCount < userReviews.length

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: toggleReviewLike,
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['get-all-reviews-user', userId] })

      const previousReviews = queryClient.getQueryData(['get-all-reviews-user', userId])

      queryClient.setQueryData(['get-all-reviews-user', userId], (old: UserReviewsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          reviews: old.reviews.map((review) => {
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
        }
      })

      return { previousReviews }
    },
    onError: (err, _reviewId, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(['get-all-reviews-user', userId], context.previousReviews)
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

        {/* Currently Playing Section */}
        {currentlyPlayingData?.game && (
          <div className="bg-green-100 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] px-4 py-3 mb-8 flex items-center gap-3">
            <Link to="/games/$gameId" params={{ gameId: currentlyPlayingData.game.id }}>
              {currentlyPlayingData.game.coverUrl ? (
                <img
                  src={currentlyPlayingData.game.coverUrl}
                  alt={currentlyPlayingData.game.name}
                  className="w-12 h-16 object-cover border-2 border-stone-900"
                />
              ) : (
                <div className="w-12 h-16 bg-stone-200 border-2 border-stone-900 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-stone-500" />
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-stone-600 font-medium">Currently Playing</div>
              <Link
                to="/games/$gameId"
                params={{ gameId: currentlyPlayingData.game.id }}
                className="font-bold hover:underline truncate block text-stone-900"
              >
                {currentlyPlayingData.game.name}
              </Link>
              {currentlyPlayingData.session?.startedAt && (
                <div className="text-xs text-stone-600">
                  Started {new Date(currentlyPlayingData.session.startedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabbed Content Section */}
        <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]">
          {/* Tab Headers */}
          <div className="flex border-b-4 border-stone-900">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${
                activeTab === 'reviews'
                  ? 'bg-amber-200 text-stone-900'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Heart className="w-4 h-4" />
              Reviews ({totalReviewCount})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-stone-900 ${
                activeTab === 'history'
                  ? 'bg-amber-200 text-stone-900'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <History className="w-4 h-4" />
              Play History ({playSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-stone-900 ${
                activeTab === 'wishlist'
                  ? 'bg-amber-200 text-stone-900'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <CalendarHeart className="w-4 h-4" />
              Want to Play ({wishlistItems.length})
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-stone-900 ${
                activeTab === 'lists'
                  ? 'bg-amber-200 text-stone-900'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              Lists ({gameLists.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 relative">
            {/* Reviews Tab */}
            <div className={activeTab !== 'reviews' ? 'invisible absolute inset-0 p-6' : ''}>
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
                  {displayedReviews.map((review: Review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onLike={handleLikeReview}
                      isLiking={likeMutation.isPending && likeMutation.variables === String(review.id)}
                    />
                  ))}

                  {/* Load More Button */}
                  {hasMoreReviews && (
                    <div className="flex justify-center pt-4">
                      <Button onClick={() => setDisplayCount(prev => prev + REVIEWS_PER_PAGE)}>
                        Load More
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

            {/* Play History Tab */}
            <div className={activeTab !== 'history' ? 'invisible absolute inset-0 p-6' : ''}>
              {playHistoryPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-stone-50 border-4 border-stone-900 p-4 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-32 bg-stone-200" />
                          <div className="h-4 w-24 bg-stone-200" />
                          <div className="h-4 w-20 bg-stone-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : playSessions.length > 0 ? (
                <div className="space-y-4">
                  {playSessions.map((session) => (
                    <SessionCard key={session.session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-900 font-bold mb-2">No play history yet</p>
                  <p className="text-stone-600 text-sm">
                    This user hasn't started any gaming sessions yet.
                  </p>
                </div>
              )}
            </div>

            {/* Want to Play Tab */}
            <div className={activeTab !== 'wishlist' ? 'invisible absolute inset-0 p-6' : ''}>
              {wishlistPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-stone-50 border-4 border-stone-900 p-4 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-32 bg-stone-200" />
                          <div className="h-4 w-24 bg-stone-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : wishlistItems.length > 0 ? (
                <div className="space-y-4">
                  {wishlistItems.map((item) => (
                    <WishlistCard key={item.gameId} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarHeart className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-900 font-bold mb-2">No games in wishlist</p>
                  <p className="text-stone-600 text-sm">
                    This user hasn't added any games to their wishlist yet.
                  </p>
                </div>
              )}
            </div>

            {/* Lists Tab */}
            <div className={activeTab !== 'lists' ? 'invisible absolute inset-0 p-6' : ''}>
              <ListsSection userId={userId} isOwnProfile={false} />
            </div>
          </div>
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
