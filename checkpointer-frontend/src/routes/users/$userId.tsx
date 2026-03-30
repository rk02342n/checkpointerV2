import { useEffect, useCallback } from 'react'
import { usePostHog } from 'posthog-js/react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { publicUserProfileQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getReviewsByUserIdInfiniteOptions, toggleReviewLike, type UserReviewsResponse } from '@/lib/reviewsQuery'
import { userCurrentlyPlayingQueryOptions, playHistoryInfiniteOptions } from '@/lib/gameSessionsQuery'
import { userWishlistInfiniteOptions } from '@/lib/wantToPlayQuery'
import { followCountsQueryOptions, followStatusQueryOptions, toggleFollow, type FollowCounts } from '@/lib/followsQuery'
import { Gamepad2, Heart, History, CalendarHeart, ListPlus, UserPlus, UserMinus, FileText } from 'lucide-react'
import { getProfileHeaderStyle, getProfileContentStyle, hasCustomColors } from '@/lib/profileTheme'
import { useProfileFont } from '@/lib/useProfileFont'
import { toast } from 'sonner'
import { ReviewCard, SessionCard, WishlistCard, type Review } from '@/components/profile/ProfileCards'
import { ListsSection } from '@/components/ListsSection'
import { LoadMoreButton } from '@/components/LoadMoreButton'
import { userGameListsInfiniteOptions } from '@/lib/gameListsQuery'
import { userPublishedPostsQueryOptions, type BlogPostDetail } from '@/lib/blogPostsQuery'
import { BlogPostCard } from '@/components/BlogPostCard'

const VALID_TABS = ['reviews', 'history', 'wishlist', 'lists', 'posts'] as const
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
import Navbar from '@/components/Navbar'
import { Skeleton } from '@/components/ui/skeleton'
import { useSettings } from '@/lib/settingsContext'

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
        from: Route.fullPath,
        search: () => ({ tab: newTab === 'reviews' ? undefined : newTab }),
        replace: true,
      })
    },
    [navigate]
  )

  const { isPending: isProfilePending, data: profileData, error: profileError } = useQuery(publicUserProfileQueryOptions(userId))
  const { data: dbUserData } = useQuery(dbUserQueryOptions)

  const isOwnProfile = dbUserData?.account?.id === userId
  const isAuthenticated = !!dbUserData?.account
  const { settings } = useSettings()
  const isAdmin = dbUserData?.account?.role === 'admin'
  const showBlogPosts = isAdmin || !!settings.blogPostsEnabled

  useProfileFont(profileData?.profileTheme?.fontFamily)
  const themed = hasCustomColors(profileData?.profileTheme)

  // Get follow counts
  const { data: followCountsData } = useQuery({
    ...followCountsQueryOptions(userId),
    enabled: !!userId,
  })

  // Check if current user follows this profile
  const { data: followStatusData } = useQuery({
    ...followStatusQueryOptions(userId),
    enabled: isAuthenticated && !isOwnProfile,
  })

  // Get user's currently playing
  const { data: currentlyPlayingData } = useQuery({
    ...userCurrentlyPlayingQueryOptions(userId),
    enabled: !!userId,
  })

  // Get user's reviews (infinite)
  const {
    data: reviewsData,
    isPending: reviewsPending,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: isFetchingMoreReviews,
    fetchNextPage: fetchMoreReviews,
  } = useInfiniteQuery({
    ...getReviewsByUserIdInfiniteOptions(userId),
    enabled: !!userId
  })

  // Get user's play history (infinite)
  const {
    data: playHistoryData,
    isPending: playHistoryPending,
    hasNextPage: hasMoreHistory,
    isFetchingNextPage: isFetchingMoreHistory,
    fetchNextPage: fetchMoreHistory,
  } = useInfiniteQuery({
    ...playHistoryInfiniteOptions(userId),
    enabled: !!userId
  })

  // Get user's wishlist (infinite)
  const {
    data: wishlistData,
    isPending: wishlistPending,
    hasNextPage: hasMoreWishlist,
    isFetchingNextPage: isFetchingMoreWishlist,
    fetchNextPage: fetchMoreWishlist,
  } = useInfiniteQuery({
    ...userWishlistInfiniteOptions(userId),
    enabled: !!userId
  })

  // Get user's public game lists (for tab count)
  const {
    data: gameListsData,
  } = useInfiniteQuery({
    ...userGameListsInfiniteOptions(userId),
    enabled: !!userId
  })

  // Get user's published blog posts
  const { data: blogPostsData, isPending: blogPostsPending } = useQuery({
    ...userPublishedPostsQueryOptions(userId),
    enabled: !!userId && showBlogPosts,
  })
  const blogPosts = blogPostsData?.posts ?? []

  // Track public profile view
  useEffect(() => {
    posthog.capture('public_profile_viewed', { viewed_user_id: userId })
  }, [userId])

  // Redirect away from posts tab if blog posts are not accessible
  useEffect(() => {
    if (!showBlogPosts && activeTab === 'posts') {
      setActiveTab('reviews')
    }
  }, [showBlogPosts, activeTab, setActiveTab])

  const userReviews = reviewsData?.pages.flatMap(p => p.reviews) ?? []
  const totalReviewCount = reviewsData?.pages[0]?.totalCount ?? 0
  const playSessions = playHistoryData?.pages.flatMap(p => p.sessions) ?? []
  const totalHistoryCount = playHistoryData?.pages[0]?.totalCount ?? 0
  const totalListsCount = gameListsData?.pages[0]?.totalCount ?? 0
  const wishlistItems = wishlistData?.pages.flatMap(p => p.wishlist) ?? []
  const totalWishlistCount = wishlistData?.pages[0]?.totalCount ?? 0

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: toggleReviewLike,
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['get-reviews-user', userId] })

      const previousReviews = queryClient.getQueryData(['get-reviews-user', userId])

      queryClient.setQueryData(['get-reviews-user', userId], (old: InfiniteData<UserReviewsResponse> | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            reviews: page.reviews.map((review) => {
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

  // Follow mutation with optimistic updates
  const followMutation = useMutation({
    mutationFn: toggleFollow,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follow-status', userId] })
      await queryClient.cancelQueries({ queryKey: ['follow-counts', userId] })

      const previousStatus = queryClient.getQueryData(['follow-status', userId])
      const previousCounts = queryClient.getQueryData(['follow-counts', userId])

      const wasFollowing = followStatusData?.following ?? false

      queryClient.setQueryData(['follow-status', userId], { following: !wasFollowing })
      queryClient.setQueryData(['follow-counts', userId], (old: FollowCounts | undefined) => {
        if (!old) return old
        return {
          ...old,
          followersCount: wasFollowing ? old.followersCount - 1 : old.followersCount + 1,
        }
      })

      return { previousStatus, previousCounts }
    },
    onError: (_err, _userId, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['follow-status', userId], context.previousStatus)
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(['follow-counts', userId], context.previousCounts)
      }
      toast.error('Failed to update follow status')
    },
  })

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to follow users")
      return
    }
    followMutation.mutate(userId)
  }

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

      <div className="container mx-auto max-w-4xl px-6 py-8 profile-themed-content" style={getProfileContentStyle(profileData?.profileTheme)}>
        {/* Profile Header */}
        <div
          className="border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-8 mb-8"
          style={getProfileHeaderStyle(profileData?.profileTheme, "rgb(96 165 250 / 0.4)")}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <Avatar className="w-24 h-24 border-4 border-border">
              <AvatarImage
                src={user?.avatarUrl ? `/api/user/avatar/${user.id}?v=${encodeURIComponent(user.avatarUrl)}` : undefined}
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
              {user?.bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{user.bio}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className={`${themed ? 'profile-accent' : 'bg-background'} border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2`}>
                  <div className="text-2xl font-bold text-foreground">{totalReviewCount}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Reviews</div>
                </div>
                <div className={`${themed ? 'profile-accent' : 'bg-background'} border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2`}>
                  <div className="text-2xl font-bold text-foreground">{followCountsData?.followersCount ?? 0}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Followers</div>
                </div>
                <div className={`${themed ? 'profile-accent' : 'bg-background'} border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2`}>
                  <div className="text-2xl font-bold text-foreground">{followCountsData?.followingCount ?? 0}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Following</div>
                </div>
              </div>
              {/* Follow Button */}
              {isAuthenticated && !isOwnProfile && (
                <div className="mt-4 flex justify-center md:justify-start">
                  <button
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    className={`flex items-center gap-2 px-6 py-2 border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] font-bold uppercase tracking-wide text-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 ${
                      followStatusData?.following
                        ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-300 dark:hover:bg-rose-900/80'
                        : 'bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-200 hover:bg-green-300 dark:hover:bg-green-900/80'
                    }`}
                  >
                    {followStatusData?.following ? (
                      <><UserMinus className="w-4 h-4" /> Unfollow</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Follow</>
                    )}
                  </button>
                </div>
              )}
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
                  ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                  : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`
              }`}
            >
              <Heart className="w-4 h-4" />
              Reviews ({totalReviewCount})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                activeTab === 'history'
                  ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                  : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`
              }`}
            >
              <History className="w-4 h-4" />
              Play History ({totalHistoryCount})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                activeTab === 'wishlist'
                  ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                  : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`
              }`}
            >
              <CalendarHeart className="w-4 h-4" />
              Want to Play ({totalWishlistCount})
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                activeTab === 'lists'
                  ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                  : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`
              }`}
            >
              <ListPlus className="w-4 h-4" />
              Lists ({totalListsCount})
            </button>
            {showBlogPosts && (
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-l-4 border-border ${
                  activeTab === 'posts'
                    ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                    : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`
                }`}
              >
                <FileText className="w-4 h-4" />
                Posts ({blogPosts.length})
              </button>
            )}
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
                  {userReviews.map((review: Review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onLike={handleLikeReview}
                      isLiking={likeMutation.isPending && likeMutation.variables === String(review.id)}
                      themed={themed}
                    />
                  ))}

                  <LoadMoreButton
                    hasNextPage={!!hasMoreReviews}
                    isFetchingNextPage={isFetchingMoreReviews}
                    fetchNextPage={fetchMoreReviews}
                  />
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
                    <SessionCard key={session.session.id} session={session} themed={themed} />
                  ))}
                  <LoadMoreButton
                    hasNextPage={!!hasMoreHistory}
                    isFetchingNextPage={isFetchingMoreHistory}
                    fetchNextPage={fetchMoreHistory}
                  />
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
                    <WishlistCard key={item.gameId} item={item} themed={themed} />
                  ))}
                  <LoadMoreButton
                    hasNextPage={!!hasMoreWishlist}
                    isFetchingNextPage={isFetchingMoreWishlist}
                    fetchNextPage={fetchMoreWishlist}
                  />
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
              <ListsSection userId={userId} isOwnProfile={false} showSaveButtons={!!dbUserData?.account} themed={themed} />
            </div>

            {/* Posts Tab */}
            {showBlogPosts && <div className={activeTab !== 'posts' ? 'hidden' : ''}>
              {blogPostsPending ? (
                <div className="space-y-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-muted border-4 border-border p-6 animate-pulse">
                      <div className="h-6 w-48 bg-muted-foreground/20 mb-3" />
                      <div className="h-4 w-full bg-muted-foreground/20 mb-2" />
                      <div className="h-4 w-2/3 bg-muted-foreground/20" />
                    </div>
                  ))}
                </div>
              ) : blogPosts.length > 0 ? (
                <div className="space-y-4">
                  {blogPosts.map(({ post, blocks }: BlogPostDetail) => (
                    <BlogPostCard key={post.id} post={post} blocks={blocks} themed={themed} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-foreground font-bold mb-2">No posts yet</p>
                  <p className="text-muted-foreground text-sm">
                    This user hasn't published any posts yet.
                  </p>
                </div>
              )}
            </div>}
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
