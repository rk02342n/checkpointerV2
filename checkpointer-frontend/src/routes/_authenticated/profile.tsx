import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getAllReviewsByUserIdQueryOptions, deleteReview, toggleReviewLike, type UserReviewsResponse } from '@/lib/reviewsQuery'
import { currentlyPlayingQueryOptions, stopPlaying, playHistoryQueryOptions, type SessionStatus } from '@/lib/gameSessionsQuery'
import { wantToPlayQueryOptions, removeFromWishlist, type WishlistResponse } from '@/lib/wantToPlayQuery'
import { Gamepad2, Search, X, Camera, Pencil, Check, Loader2, AlertTriangle, Clock, History, CalendarHeart, Heart, ListPlus } from 'lucide-react'
import { type WishlistItem } from '@/lib/wantToPlayQuery'
import { toast } from 'sonner'
import { ReviewCard, SessionCard, WishlistCard, type Review } from '@/components/profile/ProfileCards'
import { ListsSection } from '@/components/ListsSection'
import { myGameListsQueryOptions } from '@/lib/gameListsQuery'
import { compressImage } from '@/lib/compressImage'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
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

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
})

const REVIEWS_PER_PAGE = 10

function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'reviews' | 'history' | 'wishlist' | 'lists'>('reviews')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(REVIEWS_PER_PAGE)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStopPlayingDialog, setShowStopPlayingDialog] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
    isCurrent: boolean
  }>({ checking: false, available: null, error: null, isCurrent: false })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isPending, data } = useQuery(userQueryOptions)
  const { isPending: isUserPending, data: dbUserData } = useQuery(dbUserQueryOptions)

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
    stopPlayingMutation.mutate(status)
    if (gameId && status === 'finished') {
      navigate({ to: '/games/$gameId', params: { gameId }, search: { review: true } })
    }
  }

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
      toast.success('Avatar updated!')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload avatar')
    },
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

  // Get user's reviews - using the database user ID (not Kinde ID)
  const dbUserId = dbUserData?.account?.id || ''
  const { data: reviewsData, isPending: reviewsPending } = useQuery({
    ...getAllReviewsByUserIdQueryOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending
  })

  // Get user's play history
  const { data: playHistoryData, isPending: playHistoryPending } = useQuery({
    ...playHistoryQueryOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending
  })

  // Get user's wishlist
  const { data: wishlistData, isPending: wishlistPending } = useQuery({
    ...wantToPlayQueryOptions,
    enabled: !!dbUserId && !isUserPending
  })

  // Get user's game lists
  const { data: gameListsData } = useQuery({
    ...myGameListsQueryOptions,
    enabled: !!dbUserId && !isUserPending
  })

  const userReviews = reviewsData?.reviews ?? []
  const totalReviewCount = reviewsData?.totalCount ?? 0
  const playSessions = playHistoryData?.sessions ?? []
  const wishlistItems = wishlistData?.wishlist ?? []
  const gameLists = gameListsData?.lists ?? []

  // Filter reviews based on search query
  const filteredReviews = useMemo(() => userReviews.filter((review: Review) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const gameName = (review.gameName || '').toLowerCase()
    const reviewText = (review.reviewText || '').toLowerCase()
    return gameName.includes(query) || reviewText.includes(query)
  }), [userReviews, searchQuery])

  // Reset display count when search query changes
  useEffect(() => {
    setDisplayCount(REVIEWS_PER_PAGE)
  }, [searchQuery])

  const displayedReviews = useMemo(() => filteredReviews.slice(0, displayCount), [filteredReviews, displayCount])
  const hasMoreReviews = displayCount < filteredReviews.length

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const reviewToDelete = userReviews.find((r: Review) => String(r.id) === reviewId)
      const result = await deleteReview(reviewId)
      return { result, gameId: reviewToDelete?.gameId }
    },
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['get-all-reviews-user', dbUserId] })

      const reviewToDelete = userReviews.find((r: Review) => String(r.id) === reviewId)
      const gameId = reviewToDelete?.gameId

      const previousUserReviews = queryClient.getQueryData(['get-all-reviews-user', dbUserId])
      const previousGameReviews = gameId
        ? queryClient.getQueryData(['get-reviews-game', gameId])
        : undefined

      queryClient.setQueryData(['get-all-reviews-user', dbUserId], (old: UserReviewsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          reviews: old.reviews.filter((r) => String(r.id) !== reviewId),
          totalCount: old.totalCount - 1
        }
      })

      if (gameId) {
        await queryClient.cancelQueries({ queryKey: ['get-reviews-game', gameId] })
        queryClient.setQueryData(['get-reviews-game', gameId], (old: Review[] | undefined) =>
          old?.filter((r) => String(r.id) !== reviewId) ?? []
        )
      }

      return { previousUserReviews, previousGameReviews, gameId }
    },
    onError: (error, _reviewId, context) => {
      if (context?.previousUserReviews) {
        queryClient.setQueryData(['get-all-reviews-user', dbUserId], context.previousUserReviews)
      }
      if (context?.gameId && context?.previousGameReviews) {
        queryClient.setQueryData(['get-reviews-game', context.gameId], context.previousGameReviews)
      }
      toast.error(error.message || 'Failed to delete review')
    },
    onSuccess: (_data, _reviewId, context) => {
      toast.success('Review deleted')
      queryClient.invalidateQueries({ queryKey: ['get-all-reviews-user', dbUserId] })
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
      await queryClient.cancelQueries({ queryKey: ['get-all-reviews-user', dbUserId] })

      const previousReviews = queryClient.getQueryData(['get-all-reviews-user', dbUserId])

      queryClient.setQueryData(['get-all-reviews-user', dbUserId], (old: UserReviewsResponse | undefined) => {
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
        queryClient.setQueryData(['get-all-reviews-user', dbUserId], context.previousReviews)
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

      const previousWishlist = queryClient.getQueryData<WishlistResponse>(['want-to-play'])
      const previousCheck = queryClient.getQueryData<{ inWishlist: boolean }>(['want-to-play-check', gameId])
      const previousCount = queryClient.getQueryData<{ count: number }>(['want-to-play-count', gameId])

      // Optimistically remove from wishlist
      if (previousWishlist) {
        queryClient.setQueryData(['want-to-play'], {
          wishlist: previousWishlist.wishlist.filter(item => item.gameId !== gameId)
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
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-rose-50">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-stone-600 font-medium">Loading profile...</div>
          </div>
        </div>
      </div>
    )
  }

  const user = data.user
  const initials = `${user.given_name?.[0] || ''}${user.family_name?.[0] || ''}`.toUpperCase()
  const reviewCount = totalReviewCount

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-rose-50 text-stone-900 selection:bg-orange-300/30">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-6 py-8 bg-white">
        {/* Profile Header */}
        <div className="bg-blue-600/40 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleAvatarClick}
              disabled={avatarMutation.isPending}
              className="relative group cursor-pointer"
            >
              <Avatar className="w-24 h-24 border-4 border-stone-900 group-hover:opacity-80 transition-opacity">
                <AvatarImage
                  src={dbUserData?.account?.avatarUrl ? `/api/user/avatar/${dbUserData.account.id}` : undefined}
                  alt={user.given_name}
                />
                <AvatarFallback className="bg-orange-100 text-stone-900 text-2xl font-bold">
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
              <h1 className="text-3xl font-bold text-stone-900">
                {user.given_name} {user.family_name}
              </h1>
              {isEditingUsername ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-stone-700 text-sm font-medium">@</span>
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
                        className={`bg-white border-2 px-2 py-1 h-7 text-sm md:w-75 sm:w-40 rounded-none pr-7 ${
                          usernameStatus.error || usernameStatus.available === false
                            ? 'border-rose-500'
                            : usernameStatus.available === true
                            ? 'border-green-500'
                            : 'border-stone-900'
                        }`}
                        autoFocus
                        disabled={usernameMutation.isPending}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {usernameStatus.checking ? (
                          <Loader2 className="w-3 h-3 text-stone-500 animate-spin" />
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
                      className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="text-stone-600 hover:text-stone-700 p-1 disabled:opacity-50"
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
                      <p className="text-stone-500 text-xs">This is your current username</p>
                    ) : usernameStatus.available === true ? (
                      <p className="text-green-600 text-xs">Username is available</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                  <p className="text-stone-700 text-sm font-medium">
                    @{dbUserData?.account?.username || 'username'}
                  </p>
                  <button
                    onClick={handleEditUsername}
                    className="text-stone-500 hover:text-stone-700 p-1"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <p className="text-stone-600 text-sm mt-1">{user.email}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className="bg-white border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] px-4 py-2">
                  <div className="text-2xl font-bold text-stone-900">{reviewCount}</div>
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

            {/* Account Actions */}
            <div className="shrink-0 flex flex-col gap-2">
              <Button
                asChild
                variant="destructive"
                className="px-6"
              >
                <a href='/api/logout'>Logout</a>
              </Button>
              <Button
                variant="outline"
                className="px-6 text-rose-600 border-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete Account
              </Button>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStopPlayingDialog(true)}
              disabled={stopPlayingMutation.isPending}
              className="shrink-0"
            >
              Done with this game?
            </Button>
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
              {/* Search Bar */}
              {userReviews.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <Input
                      type="text"
                      placeholder="Search by game name or review..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border-4 border-stone-900 pl-10 pr-10 py-2 w-full focus:ring-2 focus:ring-stone-900 rounded-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-500 hover:text-stone-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {searchQuery.trim() && (
                    <p className="text-stone-600 text-sm mt-2">
                      Showing {filteredReviews.length} of {userReviews.length} reviews
                    </p>
                  )}
                </div>
              )}

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
                filteredReviews.length > 0 ? (
                  <div className="space-y-4">
                    {displayedReviews.map((review: Review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        onDelete={handleDeleteReview}
                        isDeleting={deleteMutation.isPending && deleteMutation.variables === String(review.id)}
                        onLike={handleLikeReview}
                        isLiking={likeMutation.isPending && likeMutation.variables === String(review.id)}
                      />
                    ))}
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
                    <Search className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                    <p className="text-stone-900 font-bold mb-2">No matching reviews</p>
                    <p className="text-stone-600 text-sm mb-4">
                      Try a different search term
                    </p>
                    <Button
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Gamepad2 className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-900 font-bold mb-2">No reviews yet</p>
                  <p className="text-stone-600 text-sm mb-4">
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
                  <p className="text-stone-600 text-sm mb-4">
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
                  {wishlistItems.map((item: WishlistItem) => (
                    <WishlistCard
                      key={item.gameId}
                      item={item}
                      onRemove={handleRemoveFromWishlist}
                      isRemoving={removeWishlistMutation.isPending && removeWishlistMutation.variables === item.gameId}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarHeart className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-900 font-bold mb-2">No games in wishlist</p>
                  <p className="text-stone-600 text-sm mb-4">
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
            <div className={activeTab !== 'lists' ? 'invisible absolute inset-0 p-6' : ''}>
              <ListsSection isOwnProfile={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-stone-600">
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

      {/* Stop Playing Dialog */}
      <Dialog open={showStopPlayingDialog} onOpenChange={setShowStopPlayingDialog}>
        <DialogContent className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              End Session
            </DialogTitle>
            <DialogDescription className="text-stone-600">
              How would you like to mark this session for <span className='font-bold'>{currentlyPlayingData?.game?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleStopPlaying('finished')}
              disabled={stopPlayingMutation.isPending}
              className="bg-lime-100 hover:bg-lime-200 text-black border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-auto py-3 justify-start"
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
              className="bg-sky-100 hover:bg-sky-200 text-black border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-auto py-3 justify-start"
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
