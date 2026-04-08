import { useState, useRef, useEffect, useCallback } from 'react'
import { usePostHog } from 'posthog-js/react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { userQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getReviewsByUserIdInfiniteOptions, deleteReview, toggleReviewLike, type UserReviewsResponse } from '@/lib/reviewsQuery'
import { currentlyPlayingQueryOptions, stopPlaying, playHistoryInfiniteOptions, type SessionStatus } from '@/lib/gameSessionsQuery'
import { wishlistInfiniteOptions, removeFromWishlist, type WishlistResponse } from '@/lib/wantToPlayQuery'
import { followCountsQueryOptions, followersInfiniteOptions, followingInfiniteOptions } from '@/lib/followsQuery'
import { Gamepad2, X, Camera, Pencil, Check, Loader2, AlertTriangle, Clock, History, CalendarHeart, Heart, ListPlus, Bookmark, Users, FileText, Trash2, BarChart3, EllipsisVertical, LogOut, ImagePlus } from 'lucide-react'
import { getProfileHeaderStyle, getProfileContentStyle, hasCustomColors } from '@/lib/profileTheme'
import { useProfileFont } from '@/lib/useProfileFont'
import { type WishlistItem } from '@/lib/wantToPlayQuery'
import { toast } from 'sonner'
import { ReviewCard, SessionCard, WishlistCard, type Review } from '@/components/profile/ProfileCards'
import { ProfileTabSidebar, type ProfileTabItem } from '@/components/profile/ProfileTabSidebar'
import { ListsSection } from '@/components/ListsSection'
import { CreateListModal } from '@/components/CreateListModal'
import { GameListCard } from '@/components/GameListCard'
import { LoadMoreButton } from '@/components/LoadMoreButton'
import { myGameListsInfiniteOptions, mySavedListsInfiniteOptions, type SavedGameListSummary } from '@/lib/gameListsQuery'
import { createBlogPost, deleteBlogPost, myBlogPostsQueryOptions, type BlogPost } from '@/lib/blogPostsQuery'
import { compressImage } from '@/lib/compressImage'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Navbar from '@/components/Navbar'
import { useSettings } from '@/lib/settingsContext'
import { BlogPostCard } from '@/components/BlogPostCard'
import { InsightsTab } from '@/components/profile/InsightsTab'

const VALID_TABS = ['reviews', 'history', 'wishlist', 'lists', 'saved', 'posts', 'insights'] as const
type ProfileTab = (typeof VALID_TABS)[number]

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
  validateSearch: (search: Record<string, unknown>): { tab?: ProfileTab } => {
    const tab = VALID_TABS.includes(search.tab as ProfileTab) && search.tab !== 'reviews'
      ? (search.tab as ProfileTab)
      : undefined
    return { tab }
  },
})

function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { tab } = Route.useSearch()
  const activeTab = tab ?? 'reviews'
  const setActiveTab = useCallback(
    (newTab: ProfileTab) => {
      navigate({
        from: Route.fullPath,
        search: () => ({ tab: newTab === 'reviews' ? undefined : newTab }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [showStopPlayingDialog, setShowStopPlayingDialog] = useState(false)
  const [showFollowDialog, setShowFollowDialog] = useState<'followers' | 'following' | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
    isCurrent: boolean
  }>({ checking: false, available: null, error: null, isCurrent: false })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gifInputRef = useRef<HTMLInputElement>(null)
  const { isPending, isError, data } = useQuery(userQueryOptions)
  const { isPending: isUserPending, data: dbUserData } = useQuery(dbUserQueryOptions)

  const { settings } = useSettings()
  const isAdmin = dbUserData?.account?.role === 'admin'
  const showBlogPosts = isAdmin || !!settings.blogPostsEnabled

  useProfileFont(dbUserData?.account?.profileTheme?.fontFamily)
  const themed = hasCustomColors(dbUserData?.account?.profileTheme)

  // Currently playing query
  const { data: currentlyPlayingData } = useQuery({
    ...currentlyPlayingQueryOptions,
    enabled: !!dbUserData?.account,
  })

  // Stop playing mutation
  const stopPlayingMutation = useMutation({
    mutationFn: (status: SessionStatus) => stopPlaying(status),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['currently-playing'] })
      queryClient.invalidateQueries({ queryKey: ['play-history'] })
      setShowStopPlayingDialog(false)
      toast.success(status === 'finished' ? 'Game completed!' : 'Game stashed for later')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to stop playing')
    },
  })

  const handleStopPlaying = (status: SessionStatus) => {
    const gameId = currentlyPlayingData?.game?.id
    posthog.capture('stop_playing_from_profile', { game_id: gameId, end_status: status })
    stopPlayingMutation.mutate(status)
    if (gameId && status === 'finished') {
      navigate({ to: '/games/$gameId', params: { gameId }, search: { review: true } })
    }
  }

  // Create blog post mutation
  const createPostMutation = useMutation({
    mutationFn: () => {
      const slug = `post-${Date.now()}`
      return createBlogPost({ title: '', slug })
    },
    onSuccess: (data) => {
      // Seed cache so the new draft is immediately visible when navigating back
      queryClient.setQueryData<{ posts: BlogPost[] }>(['my-blog-posts'], (old) => {
        if (!old) return { posts: [data.post] }
        if (old.posts.some((p) => p.id === data.post.id)) return old
        return { posts: [data.post, ...old.posts] }
      })
      navigate({ to: '/blog-editor/$postId', params: { postId: data.post.id } })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create post')
    },
  })

  // Delete blog post draft mutation (optimistic)
  const deleteDraftMutation = useMutation({
    mutationFn: (postId: string) => deleteBlogPost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["my-blog-posts"] });
      const previous = queryClient.getQueryData<{ posts: BlogPost[] }>(["my-blog-posts"]);
      queryClient.setQueryData<{ posts: BlogPost[] }>(["my-blog-posts"], (old) =>
        old ? { posts: old.posts.filter((p) => p.id !== postId) } : old
      );
      return { previous };
    },
    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["my-blog-posts"], context.previous);
      }
      toast.error("Failed to delete draft");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-blog-posts"] });
    },
  });

  // Avatar upload mutation
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload avatar')
      }
      return res.json()
    },
    onSuccess: () => {
      posthog.capture('avatar_uploaded')
      toast.success('Avatar updated!')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload avatar')
    },
  })

  // Profile GIF upload mutation
  const gifMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('profileGif', file)
      const res = await fetch('/api/user/profile-gif', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload GIF')
      }
      return res.json()
    },
    onSuccess: () => {
      posthog.capture('profile_gif_uploaded')
      toast.success('Profile GIF updated!')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload GIF')
    },
  })

  // Remove profile GIF mutation
  const removeGifMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/profile-gif', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove GIF')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Profile GIF removed')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: () => toast.error('Failed to remove GIF'),
  })

  // Username update mutation
  const usernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch('/api/user/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update username')
      }
      return res.json()
    },
    onSuccess: () => {
      posthog.capture('username_updated')
      toast.success('Username updated!')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
      setIsEditingUsername(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update username')
    },
  })

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user', {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete account')
      }
      return res.json()
    },
    onSuccess: () => {
      posthog.capture('account_deleted')
      toast.success('Account deleted')
      window.location.href = '/api/logout'
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete account')
    },
  })

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate()
  }

  const handleEditUsername = () => {
    setNewUsername(dbUserData?.account?.username || '')
    setIsEditingUsername(true)
  }

  const handleSaveUsername = () => {
    if (!usernameStatus.available || usernameStatus.checking) {
      return
    }
    const trimmed = newUsername.trim()
    if (usernameStatus.isCurrent) {
      setIsEditingUsername(false)
      return
    }
    usernameMutation.mutate(trimmed)
  }

  const handleCancelEdit = () => {
    setIsEditingUsername(false)
    setNewUsername('')
    setUsernameStatus({ checking: false, available: null, error: null, isCurrent: false })
  }

  // Debounced username availability check
  useEffect(() => {
    if (!isEditingUsername || !newUsername.trim()) {
      setUsernameStatus({ checking: false, available: null, error: null, isCurrent: false })
      return
    }

    const trimmed = newUsername.trim()

    // Client-side validation first
    if (trimmed.length < 3) {
      setUsernameStatus({ checking: false, available: false, error: 'At least 3 characters', isCurrent: false })
      return
    }
    if (trimmed.length > 32) {
      setUsernameStatus({ checking: false, available: false, error: 'At most 32 characters', isCurrent: false })
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameStatus({ checking: false, available: false, error: 'Only letters, numbers, underscores', isCurrent: false })
      return
    }

    setUsernameStatus(prev => ({ ...prev, checking: true, error: null }))

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/username/check/${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        })
        if (!res.ok) throw new Error('Failed to check username')
        const data = await res.json()
        setUsernameStatus({
          checking: false,
          available: data.available,
          error: data.error || null,
          isCurrent: data.isCurrent || false
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setUsernameStatus({ checking: false, available: null, error: 'Failed to check', isCurrent: false })
        }
      }
    }, 400)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [newUsername, isEditingUsername])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please use jpeg, png, webp, or gif.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max size is 5MB.')
      return
    }

    try {
      // Compress the image to under 100KB to save storage space
      const compressedFile = await compressImage(file, 100)
      avatarMutation.mutate(compressedFile)
    } catch {
      toast.error('Failed to process image. Please try again.')
    }

    e.target.value = '' // Reset input
  }

  const handleGifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'image/gif') {
      toast.error('Only GIF files are allowed.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('GIF too large. Max size is 2MB.')
      return
    }

    gifMutation.mutate(file)
    e.target.value = ''
  }

  // Get user's reviews - using the database user ID (not Kinde ID)
  const dbUserId = dbUserData?.account?.id || ''

  // Follow counts query
  const { data: followCountsData } = useQuery({
    ...followCountsQueryOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending,
  })

  // Followers/following infinite queries (only fetch when dialog is open)
  const {
    data: followersData,
    hasNextPage: hasMoreFollowers,
    isFetchingNextPage: isFetchingMoreFollowers,
    fetchNextPage: fetchMoreFollowers,
  } = useInfiniteQuery({
    ...followersInfiniteOptions(dbUserId),
    enabled: !!dbUserId && showFollowDialog === 'followers',
  })

  const {
    data: followingData,
    hasNextPage: hasMoreFollowing,
    isFetchingNextPage: isFetchingMoreFollowing,
    fetchNextPage: fetchMoreFollowing,
  } = useInfiniteQuery({
    ...followingInfiniteOptions(dbUserId),
    enabled: !!dbUserId && showFollowDialog === 'following',
  })

  // Infinite query for reviews
  const {
    data: infiniteReviewsData,
    isPending: reviewsPending,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: isFetchingMoreReviews,
    fetchNextPage: fetchMoreReviews,
  } = useInfiniteQuery({
    ...getReviewsByUserIdInfiniteOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending,
  })

  // Get user's play history (infinite)
  const {
    data: playHistoryData,
    isPending: playHistoryPending,
    hasNextPage: hasMoreHistory,
    isFetchingNextPage: isFetchingMoreHistory,
    fetchNextPage: fetchMoreHistory,
  } = useInfiniteQuery({
    ...playHistoryInfiniteOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending
  })

  // Get user's wishlist (infinite)
  const {
    data: wishlistData,
    isPending: wishlistPending,
    hasNextPage: hasMoreWishlist,
    isFetchingNextPage: isFetchingMoreWishlist,
    fetchNextPage: fetchMoreWishlist,
  } = useInfiniteQuery({
    ...wishlistInfiniteOptions(),
    enabled: !!dbUserId && !isUserPending
  })

  // Get user's game lists (for tab count)
  const { data: gameListsData } = useInfiniteQuery({
    ...myGameListsInfiniteOptions(),
    enabled: !!dbUserId && !isUserPending
  })

  // Get user's saved lists (infinite)
  const {
    data: savedListsData,
    isPending: savedListsPending,
    hasNextPage: hasMoreSaved,
    isFetchingNextPage: isFetchingMoreSaved,
    fetchNextPage: fetchMoreSaved,
  } = useInfiniteQuery({
    ...mySavedListsInfiniteOptions(),
    enabled: !!dbUserId && !isUserPending
  })

  const userReviews = infiniteReviewsData?.pages.flatMap(p => p.reviews) ?? []
  const totalReviewCount = infiniteReviewsData?.pages[0]?.totalCount ?? 0
  const playSessions = playHistoryData?.pages.flatMap(p => p.sessions) ?? []
  const totalHistoryCount = playHistoryData?.pages[0]?.totalCount ?? 0
  const wishlistItems = wishlistData?.pages.flatMap(p => p.wishlist) ?? []
  const totalWishlistCount = wishlistData?.pages[0]?.totalCount ?? 0
  const totalListsCount = gameListsData?.pages[0]?.totalCount ?? 0
  const savedLists = savedListsData?.pages.flatMap(p => p.lists) ?? []
  const totalSavedCount = savedListsData?.pages[0]?.totalCount ?? 0

  // Blog posts query
  const { data: blogPostsData, isPending: blogPostsPending } = useQuery({
    ...myBlogPostsQueryOptions,
    enabled: !!dbUserData?.account && showBlogPosts,
  })
  const blogPosts = blogPostsData?.posts ?? []

  // Redirect away from posts tab if blog posts are not accessible
  useEffect(() => {
    if (!isUserPending && !showBlogPosts && activeTab === 'posts') {
      setActiveTab('reviews')
    }
  }, [isUserPending, showBlogPosts, activeTab, setActiveTab])

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const reviewToDelete = userReviews.find((r: Review) => String(r.id) === reviewId)
      const result = await deleteReview(reviewId)
      return { result, gameId: reviewToDelete?.gameId }
    },
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['get-reviews-user', dbUserId] })

      const reviewToDelete = userReviews.find((r: Review) => String(r.id) === reviewId)
      const gameId = reviewToDelete?.gameId

      const previousInfiniteReviews = queryClient.getQueryData(['get-reviews-user', dbUserId])
      const previousGameReviews = gameId
        ? queryClient.getQueryData(['get-reviews-game', gameId])
        : undefined

      // Optimistically update infinite query data
      queryClient.setQueryData(['get-reviews-user', dbUserId], (old: InfiniteData<UserReviewsResponse> | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page, i) => ({
            ...page,
            reviews: page.reviews.filter((r) => String(r.id) !== reviewId),
            totalCount: i === 0 ? page.totalCount - 1 : page.totalCount,
          }))
        }
      })

      if (gameId) {
        await queryClient.cancelQueries({ queryKey: ['get-reviews-game', gameId] })
        queryClient.setQueryData(['get-reviews-game', gameId], (old: Review[] | undefined) =>
          old?.filter((r) => String(r.id) !== reviewId) ?? []
        )
      }

      return { previousInfiniteReviews, previousGameReviews, gameId }
    },
    onError: (error, _reviewId, context) => {
      if (context?.previousInfiniteReviews) {
        queryClient.setQueryData(['get-reviews-user', dbUserId], context.previousInfiniteReviews)
      }
      if (context?.gameId && context?.previousGameReviews) {
        queryClient.setQueryData(['get-reviews-game', context.gameId], context.previousGameReviews)
      }
      toast.error(error.message || 'Failed to delete review')
    },
    onSuccess: (_data, reviewId, context) => {
      posthog.capture('review_deleted', { review_id: reviewId })
      toast.success('Review deleted')
      queryClient.invalidateQueries({ queryKey: ['get-reviews-user', dbUserId] })
      if (context?.gameId) {
        queryClient.invalidateQueries({ queryKey: ['get-reviews-game', context.gameId] })
      }
    }
  })

  const handleDeleteReview = useCallback((reviewId: string) => {
    deleteMutation.mutate(reviewId)
  }, [])

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: toggleReviewLike,
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['get-reviews-user', dbUserId] })

      const previousInfiniteReviews = queryClient.getQueryData(['get-reviews-user', dbUserId])

      const updateReview = (review: Review) => {
        if (String(review.id) === reviewId) {
          const currentLikeCount = Number(review.likeCount)
          return {
            ...review,
            userLiked: !review.userLiked,
            likeCount: review.userLiked ? currentLikeCount - 1 : currentLikeCount + 1,
          }
        }
        return review
      }

      queryClient.setQueryData(['get-reviews-user', dbUserId], (old: InfiniteData<UserReviewsResponse> | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            reviews: page.reviews.map(updateReview),
          }))
        }
      })

      return { previousInfiniteReviews }
    },
    onError: (err, _reviewId, context) => {
      if (context?.previousInfiniteReviews) {
        queryClient.setQueryData(['get-reviews-user', dbUserId], context.previousInfiniteReviews)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update like')
    },
  })

  const handleLikeReview = useCallback((reviewId: string) => {
    likeMutation.mutate(reviewId)
  }, [])

  // Remove from wishlist mutation with optimistic updates
  const removeWishlistMutation = useMutation({
    mutationFn: removeFromWishlist,
    onMutate: async (gameId: string) => {
      await queryClient.cancelQueries({ queryKey: ['want-to-play'] })
      await queryClient.cancelQueries({ queryKey: ['want-to-play-check', gameId] })
      await queryClient.cancelQueries({ queryKey: ['want-to-play-count', gameId] })

      const previousWishlist = queryClient.getQueryData<InfiniteData<WishlistResponse>>(['want-to-play'])
      const previousCheck = queryClient.getQueryData<{ inWishlist: boolean }>(['want-to-play-check', gameId])
      const previousCount = queryClient.getQueryData<{ count: number }>(['want-to-play-count', gameId])

      // Optimistically remove from wishlist (InfiniteData shape)
      if (previousWishlist) {
        queryClient.setQueryData(['want-to-play'], {
          ...previousWishlist,
          pages: previousWishlist.pages.map((page, i) => ({
            ...page,
            wishlist: page.wishlist.filter(item => item.gameId !== gameId),
            totalCount: i === 0 ? page.totalCount - 1 : page.totalCount,
          }))
        })
      }

      // Update check status
      queryClient.setQueryData(['want-to-play-check', gameId], { inWishlist: false })

      // Update count
      if (previousCount) {
        queryClient.setQueryData(['want-to-play-count', gameId], {
          count: Math.max(0, previousCount.count - 1)
        })
      }

      return { previousWishlist, previousCheck, previousCount, gameId }
    },
    onError: (err, gameId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(['want-to-play'], context.previousWishlist)
      }
      if (context?.previousCheck) {
        queryClient.setQueryData(['want-to-play-check', gameId], context.previousCheck)
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['want-to-play-count', gameId], context.previousCount)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to remove from wishlist')
    },
    onSuccess: () => {
      toast.success('Removed from wishlist')
    }
  })

  const handleRemoveFromWishlist = useCallback((gameId: string) => {
    removeWishlistMutation.mutate(gameId)
  }, [])

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground font-medium">Loading profile...</div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground font-medium">Failed to load profile</div>
          </div>
        </div>
      </div>
    )
  }

  const user = data.user
  const initials = `${user.given_name?.[0] || ''}${user.family_name?.[0] || ''}`.toUpperCase()

  const profileTabs: ProfileTabItem[] = [
    { id: 'reviews', label: 'Reviews', icon: Heart, count: totalReviewCount },
    { id: 'history', label: 'Play History', icon: History, count: totalHistoryCount },
    { id: 'wishlist', label: 'Want to Play', icon: CalendarHeart, count: totalWishlistCount },
    { id: 'lists', label: 'Lists', icon: ListPlus, count: totalListsCount },
    { id: 'saved', label: 'Saved', icon: Bookmark, count: totalSavedCount },
    ...(showBlogPosts ? [{ id: 'posts', label: 'Posts', icon: FileText, count: blogPosts.length } as ProfileTabItem] : []),
    { id: 'insights', label: 'Insights', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-background selection:bg-orange-300/30" style={dbUserData?.account?.profileTheme?.backgroundColor ? { backgroundColor: dbUserData.account.profileTheme.backgroundColor } : undefined}>
      <Navbar />
      <div className="container mx-auto bg-background max-w-4xl px-6 py-8 profile-themed-content" style={getProfileContentStyle(dbUserData?.account?.profileTheme)}>
        {/* Profile Header */}
        <div
          className="relative border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-8 mb-8"
          style={getProfileHeaderStyle(dbUserData?.account?.profileTheme, "rgb(96 165 250 / 0.4)")}
        >
          {dbUserData?.account?.profileGifUrl && (
            <img
              src={`/api/user/profile-gif/${dbUserData.account.id}?v=${encodeURIComponent(dbUserData.account.profileGifUrl)}`}
              alt="Profile GIF"
              className="absolute top-8 right-8 w-[96px] h-[96px] object-cover border-2 border-border rounded-sm hidden md:block"
            />
          )}
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={gifInputRef}
              type="file"
              accept="image/gif"
              onChange={handleGifChange}
              className="hidden"
            />
            <button
              onClick={handleAvatarClick}
              disabled={avatarMutation.isPending}
              className="relative group cursor-pointer"
            >
              <Avatar className="w-24 h-24 border-4 border-border group-hover:opacity-80 transition-opacity">
                <AvatarImage
                  src={dbUserData?.account?.avatarUrl ? `/api/user/avatar/${dbUserData.account.id}?v=${encodeURIComponent(dbUserData.account.avatarUrl)}` : undefined}
                  alt={user.given_name}
                />
                <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarMutation.isPending ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-foreground">
                {user.given_name} {user.family_name}
              </h1>
              {isEditingUsername ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-muted-foreground text-sm font-medium">@</span>
                    <div className="relative">
                      <Input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && usernameStatus.available && !usernameStatus.checking) {
                            handleSaveUsername()
                          }
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className={`bg-background border-2 px-2 py-1 h-7 text-sm md:w-75 sm:w-40 rounded-none pr-7 ${
                          usernameStatus.error || usernameStatus.available === false
                            ? 'border-rose-500'
                            : usernameStatus.available === true
                            ? 'border-green-500'
                            : 'border-border'
                        }`}
                        autoFocus
                        disabled={usernameMutation.isPending}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {usernameStatus.checking ? (
                          <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                        ) : usernameStatus.available === true ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : usernameStatus.available === false ? (
                          <X className="w-3 h-3 text-rose-500" />
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={handleSaveUsername}
                      disabled={usernameMutation.isPending || usernameStatus.checking || !usernameStatus.available}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save username"
                    >
                      {usernameMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={usernameMutation.isPending}
                      className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Status message */}
                  <div className="h-4 text-center md:text-left pb-2 md:pl-6 mt-2 mb-4">
                    {usernameStatus.error ? (
                      <p className="text-rose-500 text-xs">{usernameStatus.error}</p>
                    ) : usernameStatus.available === false ? (
                      <p className="text-rose-500 text-xs">Username is taken</p>
                    ) : usernameStatus.isCurrent ? (
                      <p className="text-muted-foreground text-xs">This is your current username</p>
                    ) : usernameStatus.available === true ? (
                      <p className="text-green-600 dark:text-green-400 text-xs">Username is available</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                  <p className="text-muted-foreground text-sm font-medium">
                    @{dbUserData?.account?.username || 'username'}
                  </p>
                  <button
                    onClick={handleEditUsername}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
              {dbUserData?.account?.bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{dbUserData.account.bio}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className={`${themed ? 'profile-accent' : 'bg-background'} border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2`}>
                  <div className="text-2xl font-bold text-foreground">{totalReviewCount}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Reviews</div>
                </div>
                <button
                  onClick={() => setShowFollowDialog('followers')}
                  className={`${themed ? 'profile-accent' : 'bg-background'} border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2 hover:opacity-80 cursor-pointer active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all`}
                >
                  <div className="text-2xl font-bold text-foreground">{followCountsData?.followersCount ?? 0}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Followers</div>
                </button>
                <button
                  onClick={() => setShowFollowDialog('following')}
                  className={`${themed ? 'profile-accent' : 'bg-background'} border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] px-4 py-2 hover:opacity-80 cursor-pointer active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all`}
                >
                  <div className="text-2xl font-bold text-foreground">{followCountsData?.followingCount ?? 0}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Following</div>
                </button>
              </div>
            </div>

            {/* Account Actions */}
            <div className="shrink-0 self-end mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 text-foreground hover:text-muted-foreground transition-colors cursor-pointer">
                    <EllipsisVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{
                    ...(dbUserData?.account?.profileTheme?.headerColor
                      ? { backgroundColor: dbUserData.account.profileTheme.headerColor }
                      : {}),
                    ...(dbUserData?.account?.profileTheme?.headerFontColor
                      ? { color: dbUserData.account.profileTheme.headerFontColor }
                      : {}),
                    ...(dbUserData?.account?.profileTheme?.fontFamily
                      ? { fontFamily: `"${dbUserData.account.profileTheme.fontFamily}", system-ui, sans-serif` }
                      : {}),
                  } as React.CSSProperties}
                >
                  <DropdownMenuItem onClick={() => setShowCreateListModal(true)}>
                    <ListPlus className="w-4 h-4" />
                    Create List
                  </DropdownMenuItem>
                  {showBlogPosts && (
                    <DropdownMenuItem
                      onClick={() => createPostMutation.mutate()}
                      disabled={createPostMutation.isPending}
                    >
                      {createPostMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      New Post
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => gifInputRef.current?.click()}
                    disabled={gifMutation.isPending}
                  >
                    {gifMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    {dbUserData?.account?.profileGifUrl ? 'Change profile GIF' : 'Add GIF to profile'}
                  </DropdownMenuItem>
                  {dbUserData?.account?.profileGifUrl && (
                    <DropdownMenuItem
                      onClick={() => removeGifMutation.mutate()}
                      disabled={removeGifMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove profile GIF
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Currently Playing Section */}
        {currentlyPlayingData?.game && (
          <div className="bg-green-600 border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] px-4 py-3 mb-8 flex items-center gap-3">
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
              <div className="text-xs uppercase tracking-wide font-medium">Currently Playing</div>
              <Link
                to="/games/$gameId"
                params={{ gameId: currentlyPlayingData.game.id }}
                className="font-bold hover:underline truncate block"
              >
                {currentlyPlayingData.game.name}
              </Link>
              {currentlyPlayingData.session?.startedAt && (
                <div className="text-xs">
                  Started {new Date(currentlyPlayingData.session.startedAt).toLocaleString()}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStopPlayingDialog(true)}
              disabled={stopPlayingMutation.isPending}
              className="shrink-0 text-accent-foreground"
            >
              Done with this game?
            </Button>
          </div>
        )}

        {/* Tabbed Content Section */}
        <ProfileTabSidebar
          tabs={profileTabs}
          activeTab={activeTab}
          layout='sidebar'
          onTabChange={(tab) => {
            posthog.capture('profile_tab_changed', { tab })
            setActiveTab(tab as ProfileTab)
          }}
          themed={themed}
          themeStyle={themed && dbUserData?.account?.profileTheme?.headerFontColor
            ? { "--foreground": dbUserData.account.profileTheme.headerFontColor } as React.CSSProperties
            : undefined}
          contentStyle={themed ? getProfileContentStyle(dbUserData?.account?.profileTheme) : undefined}
        >
            {/* Reviews Tab */}
            <div className={activeTab !== 'reviews' ? 'hidden' : ''}>
              {/* Reviews Skeleton */}
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
                      onDelete={handleDeleteReview}
                      isDeleting={deleteMutation.isPending && deleteMutation.variables === String(review.id)}
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
                  <p className="text-muted-foreground text-sm mb-4">
                    Start playing games and share your thoughts!
                  </p>
                  <Button
                    onClick={() => navigate({ to: '/' })}
                  >
                    Browse Games
                  </Button>
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
                  <p className="text-muted-foreground text-sm mb-4">
                    Start tracking your gaming sessions by clicking "Play" on a game page!
                  </p>
                  <Button
                    onClick={() => navigate({ to: '/' })}
                  >
                    Browse Games
                  </Button>
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
                  {wishlistItems.map((item: WishlistItem) => (
                    <WishlistCard
                      key={item.gameId}
                      item={item}
                      onRemove={handleRemoveFromWishlist}
                      isRemoving={removeWishlistMutation.isPending && removeWishlistMutation.variables === item.gameId}
                      themed={themed}
                    />
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
                  <p className="text-muted-foreground text-sm mb-4">
                    Click "Want" on a game page to add it to your wishlist!
                  </p>
                  <Button
                    onClick={() => navigate({ to: '/' })}
                  >
                    Browse Games
                  </Button>
                </div>
              )}
            </div>

            {/* Lists Tab */}
            <div className={activeTab !== 'lists' ? 'hidden' : ''}>
              <ListsSection isOwnProfile={true} themed={themed} />
            </div>

            {/* Saved Tab */}
            <div className={activeTab !== 'saved' ? 'hidden' : ''}>
              {savedListsPending ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] overflow-hidden animate-pulse">
                      <div className="aspect-video bg-muted-foreground/20" />
                      <div className="p-3">
                        <div className="h-5 w-3/4 bg-muted-foreground/20 mb-2" />
                        <div className="h-4 w-full bg-muted-foreground/20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : savedLists.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedLists.map((list: SavedGameListSummary) => (
                      <div key={list.id} className="relative">
                        <GameListCard list={list} showSaveButton themed={themed} />
                        <div className="absolute top-2 left-2 z-10 bg-stone-900/80 text-white text-xs font-medium px-2 py-0.5">
                          @{list.ownerUsername}
                        </div>
                      </div>
                    ))}
                  </div>
                  <LoadMoreButton
                    hasNextPage={!!hasMoreSaved}
                    isFetchingNextPage={isFetchingMoreSaved}
                    fetchNextPage={fetchMoreSaved}
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-foreground font-bold mb-2">No saved lists</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Save other users' lists to find them here!
                  </p>
                </div>
              )}
            </div>

            {/* Posts Tab */}
            {showBlogPosts && (
            <div className={activeTab !== 'posts' ? 'hidden' : ''}>
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
                  {blogPosts.map((post: BlogPost) =>
                    post.status === 'draft' ? (
                      // Editable Draft Card (old version)
                      <div
                        key={post.id}
                        onClick={() =>
                          navigate({
                            to: '/blog-editor/$postId',
                            params: { postId: post.id },
                          })
                        }
                        className={`block bg-card profile-card profile-card-hover
                          border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all p-4 cursor-pointer`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2 border-border bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 mb-1">
                              draft
                            </span>
                            <h3 className="font-bold text-foreground truncate">
                              {post.title}
                            </h3>
                            {post.subtitle && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {post.subtitle}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Updated{' '}
                              {new Date(post.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDraftMutation.mutate(post.id);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              aria-label="Delete draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Read-only Published Card (new version)
                      <BlogPostCard key={post.id} post={post} themed={themed} />
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-foreground font-bold mb-2">No posts yet</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Write your first blog post!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => createPostMutation.mutate()}
                    disabled={createPostMutation.isPending}
                    className="border-4 border-border text-black"
                  >
                    {createPostMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    New Post
                  </Button>
                </div>
              )}
            </div>
            )}

            {/* Insights Tab */}
            <div className={activeTab !== 'insights' ? 'hidden' : ''}>
              <InsightsTab themed={themed} />
            </div>
        </ProfileTabSidebar>
      </div>

      {/* Create List Modal */}
      <CreateListModal
        open={showCreateListModal}
        onOpenChange={setShowCreateListModal}
      />

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-background border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your account and remove all your data including your reviews.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteAccountMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Followers/Following Dialog */}
      <Dialog open={showFollowDialog !== null} onOpenChange={(open) => !open && setShowFollowDialog(null)}>
        <DialogContent className="bg-background border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] rounded-none max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5" />
              {showFollowDialog === 'followers' ? 'Followers' : 'Following'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {showFollowDialog === 'followers'
                ? `${followCountsData?.followersCount ?? 0} followers`
                : `Following ${followCountsData?.followingCount ?? 0} users`}
            </DialogDescription>
            {/* Tab switcher */}
            <div className="flex border-b-4 border-border mt-2">
              <button
                onClick={() => setShowFollowDialog('followers')}
                className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-widest ${
                  showFollowDialog === 'followers'
                    ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                    : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'} cursor-pointer`
                }`}
              >
                Followers ({followCountsData?.followersCount ?? 0})
              </button>
              <button
                onClick={() => setShowFollowDialog('following')}
                className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-widest border-l-4 border-border ${
                  showFollowDialog === 'following'
                    ? `${themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'} text-foreground`
                    : `${themed ? 'profile-accent-muted text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'} cursor-pointer`
                }`}
              >
                Following ({followCountsData?.followingCount ?? 0})
              </button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {(() => {
              const users = showFollowDialog === 'followers'
                ? followersData?.pages.flatMap(p => p.users) ?? []
                : followingData?.pages.flatMap(p => p.users) ?? []
              const hasMore = showFollowDialog === 'followers' ? hasMoreFollowers : hasMoreFollowing
              const isFetchingMore = showFollowDialog === 'followers' ? isFetchingMoreFollowers : isFetchingMoreFollowing
              const fetchMore = showFollowDialog === 'followers' ? fetchMoreFollowers : fetchMoreFollowing

              if (users.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-foreground font-bold mb-2">
                      {showFollowDialog === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                    </p>
                  </div>
                )
              }

              return (
                <div className="space-y-2 py-2">
                  {users.map((user) => (
                    <Link
                      key={user.id}
                      to="/users/$userId"
                      params={{ userId: user.id }}
                      onClick={() => setShowFollowDialog(null)}
                      className="flex items-center gap-3 p-3 border-4 border-border hover:bg-accent transition-colors"
                    >
                      <Avatar className="w-10 h-10 border-2 border-border">
                        <AvatarImage
                          src={user.avatarUrl ? `/api/user/avatar/${user.id}?v=${encodeURIComponent(user.avatarUrl)}` : undefined}
                          alt={user.displayName || user.username}
                        />
                        <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-foreground text-sm font-bold">
                          {(user.username || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground truncate">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </Link>
                  ))}
                  <LoadMoreButton
                    hasNextPage={!!hasMore}
                    isFetchingNextPage={isFetchingMore}
                    fetchNextPage={fetchMore}
                  />
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop Playing Dialog */}
      <Dialog open={showStopPlayingDialog} onOpenChange={setShowStopPlayingDialog}>
        <DialogContent className="bg-background border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              End Session
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              How would you like to mark this session for <span className='font-bold'>{currentlyPlayingData?.game?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleStopPlaying('finished')}
              disabled={stopPlayingMutation.isPending}
              className="bg-lime-100 hover:bg-lime-200 dark:bg-lime-800 hover:dark:bg-lime-600 text-foreground border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-auto py-3 justify-start"
            >
              <Check className="w-5 h-5 mr-2" />
              <div className="text-left">
                <div className="font-bold">Finished</div>
                <div className="text-xs opacity-90">I completed this game</div>
              </div>
            </Button>
            <Button
              onClick={() => handleStopPlaying('stashed')}
              disabled={stopPlayingMutation.isPending}
              className="bg-sky-100 hover:bg-sky-200 dark:bg-sky-800 hover:dark:bg-sky-600 text-foreground border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-auto py-3 justify-start"
            >
              <Clock className="w-5 h-5 mr-2" />
              <div className="text-left">
                <div className="font-bold">Stash for now</div>
                <div className="text-xs opacity-90">I'll come back to this later</div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStopPlayingDialog(false)}
              disabled={stopPlayingMutation.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
