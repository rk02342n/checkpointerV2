import { useState, useMemo, useEffect, useCallback } from 'react'
import { usePostHog } from 'posthog-js/react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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

const VALID_TABS = ['reviews', 'history', 'wishlist', 'lists'] as const
type ProfileTab = (typeof VALID_TABS)[number]

export const Route = createFileRoute('/users/$userId')({
  component: PublicProfile,
  validateSearch: (search: Record<string, unknown>): { tab?: ProfileTab } => {
    const tab = VALID_TABS.includes(search.tab as ProfileTab) && search.tab !== 'reviews'
      ? (search.tab as ProfileTab)
      : undefined
    return { tab }
  },
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
  const posthog = usePostHog()
  const navigate = useNavigate()
  const { tab } = Route.useSearch()
  const activeTab = tab ?? 'reviews'
  const setActiveTab = useCallback(
    (newTab: ProfileTab) => {
      navigate({
        search: { tab: newTab === 'reviews' ? undefined : newTab },
        replace: true,
      })
    },
    [navigate]
  )
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

  // Track public profile view
  useEffect(() => {
    posthog.capture('public_profile_viewed', { viewed_user_id: userId })
  }, [userId])

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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="bg-rose-100 dark:bg-rose-900/40 border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-8 text-center">
            <Gamepad2 className="w-12 h-12 text-rose-600 dark:text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">User Not Found</h2>
            <p className="text-muted-foreground">This user profile doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProfilePending) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background text-foreground selection:bg-orange-300/30">
      <Navbar />

      <div className="container mx-auto max-w-4xl px-6 py-8">
        {/* Profile Header */}
        <div className="bg-orange-100 dark:bg-orange-900/40 border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <Avatar className="w-24 h-24 border-4 border-border">
              <AvatarImage
                src={user?.avatarUrl ? `/api/user/avatar/${user.id}` : undefined}
                alt={user?.displayName || user?.username || 'User'}
              />
              <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-foreground">
                {user?.displayName || user?.username || 'Anonymous User'}
              </h1>
              {user?.username && (
                <p className="text-muted-foreground text-sm font-medium mt-1">@{user.username}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className="bg-background border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2">
                  <div className="text-2xl font-bold text-foreground">{totalReviewCount}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Reviews</div>
                </div>
                <div className="bg-background border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2">
                  <div className="text-2xl font-bold text-foreground">
                    <Gamepad2 className="w-6 h-6 inline" />
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground text-center font-medium">Gamer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currently Playing Section */}
        {currentlyPlayingData?.game && (
          <div className="bg-green-100 dark:bg-green-600/40 border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] px-4 py-3 mb-8 flex items-center gap-3">
            <Link to="/games/$gameId" params={{ gameId: currentlyPlayingData.game.id }}>
              {currentlyPlayingData.game.coverUrl ? (
                <img
                  src={currentlyPlayingData.game.coverUrl}
                  alt={currentlyPlayingData.game.name}
                  className="w-12 h-16 object-cover border-2 border-border"
                />
              ) : (
                <div className="w-12 h-16 bg-muted border-2 border-border flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Currently Playing</div>
              <Link
                to="/games/$gameId"
                params={{ gameId: currentlyPlayingData.game.id }}
                className="font-bold hover:underline truncate block text-foreground"
              >
                {currentlyPlayingData.game.name}
              </Link>
              {currentlyPlayingData.session?.startedAt && (
                <div className="text-xs text-muted-foreground">
                  Started {new Date(currentlyPlayingData.session.startedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabbed Content Section */}
        <div className="bg-card border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)]">
          {/* Tab Headers */}
          <div className="flex border-b-4 border-border">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${
                activeTab === 'reviews'
                  ? 'bg-amber-200 dark:bg-amber-900 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Heart className="w-4 h-4" />
              Reviews ({totalReviewCount})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                activeTab === 'history'
                  ? 'bg-amber-200 dark:bg-amber-900 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <History className="w-4 h-4" />
              Play History ({playSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                activeTab === 'wishlist'
                  ? 'bg-amber-200 dark:bg-amber-900 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <CalendarHeart className="w-4 h-4" />
              Want to Play ({wishlistItems.length})
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                activeTab === 'lists'
                  ? 'bg-amber-200 dark:bg-amber-900 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              Lists ({gameLists.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Reviews Tab */}
            <div className={activeTab !== 'reviews' ? 'hidden' : ''}>
              {reviewsPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-muted border-4 border-border p-4 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-muted-foreground/20 border-2 border-border" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-32 bg-muted-foreground/20" />
                          <div className="h-4 w-full bg-muted-foreground/20" />
                          <div className="h-4 w-2/3 bg-muted-foreground/20" />
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
                  <Gamepad2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-foreground font-bold mb-2">No reviews yet</p>
                  <p className="text-muted-foreground text-sm">
                    This user hasn't written any reviews yet.
                  </p>
                </div>
              )}
            </div>

            {/* Play History Tab */}
            <div className={activeTab !== 'history' ? 'hidden' : ''}>
              {playHistoryPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-muted border-4 border-border p-4 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-muted-foreground/20 border-2 border-border" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-32 bg-muted-foreground/20" />
                          <div className="h-4 w-24 bg-muted-foreground/20" />
                          <div className="h-4 w-20 bg-muted-foreground/20" />
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
                  <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-foreground font-bold mb-2">No play history yet</p>
                  <p className="text-muted-foreground text-sm">
                    This user hasn't started any gaming sessions yet.
                  </p>
                </div>
              )}
            </div>

            {/* Want to Play Tab */}
            <div className={activeTab !== 'wishlist' ? 'hidden' : ''}>
              {wishlistPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-muted border-4 border-border p-4 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-muted-foreground/20 border-2 border-border" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-32 bg-muted-foreground/20" />
                          <div className="h-4 w-24 bg-muted-foreground/20" />
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
                  <CalendarHeart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-foreground font-bold mb-2">No games in wishlist</p>
                  <p className="text-muted-foreground text-sm">
                    This user hasn't added any games to their wishlist yet.
                  </p>
                </div>
              )}
            </div>

            {/* Lists Tab */}
            <div className={activeTab !== 'lists' ? 'hidden' : ''}>
              <ListsSection userId={userId} isOwnProfile={false} showSaveButtons={!!dbUserData?.account} />
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
      <div className="bg-orange-100 dark:bg-orange-900/40 border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full bg-orange-300 dark:bg-orange-800 border-4 border-border" />
          <div className="flex-1 text-center md:text-left">
            <Skeleton className="h-9 w-48 mb-2 mx-auto md:mx-0 bg-orange-300 dark:bg-orange-800" />
            <Skeleton className="h-5 w-32 mx-auto md:mx-0 bg-orange-300 dark:bg-orange-800" />
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
              <Skeleton className="h-16 w-24 bg-background border-4 border-border" />
              <Skeleton className="h-16 w-24 bg-background border-4 border-border" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-card border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-6">
        <Skeleton className="h-5 w-24 mb-4 bg-muted-foreground/20" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted border-4 border-border p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-20 bg-muted-foreground/20 border-2 border-border" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted-foreground/20" />
                  <div className="h-4 w-full bg-muted-foreground/20" />
                  <div className="h-4 w-2/3 bg-muted-foreground/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
