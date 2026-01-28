import { useState, useRef } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getAllReviewsByUserIdQueryOptions, deleteReview, toggleReviewLike, type UserReviewsResponse } from '@/lib/reviewsQuery'
import { Gamepad2, Calendar, Trash2, Search, X, Heart, Camera } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
})

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StarRating } from '@/components/StarRating'
import Navbar from '@/components/Navbar'

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

function ReviewCard({ review, onDelete, isDeleting, onLike, isLiking }: { review: Review, onDelete: (id: string) => void, isDeleting: boolean, onLike: (id: string) => void, isLiking: boolean }) {
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
      className={`block bg-amber-200 rounded-xl border-2 border-black p-4 hover:bg-amber-300 transition-colors cursor-pointer ${isDeleting ? 'opacity-50' : ''}`}
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

          {/* Actions: Like & Delete */}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete(String(review.id))
              }}
              disabled={isDeleting}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-100 p-1 h-auto"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}

function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isPending, data } = useQuery(userQueryOptions)
  const { isPending: isUserPending, data: dbUserData } = useQuery(dbUserQueryOptions)

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    avatarMutation.mutate(file)
    e.target.value = '' // Reset input
  }

  // Get user's reviews - using the database user ID (not Kinde ID)
  const dbUserId = dbUserData?.account?.id || ''
  const { data: reviewsData, isPending: reviewsPending } = useQuery({
    ...getAllReviewsByUserIdQueryOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending
  })

  const userReviews = reviewsData?.reviews ?? []
  const totalReviewCount = reviewsData?.totalCount ?? 0

  // Filter reviews based on search query
  const filteredReviews = userReviews.filter((review: Review) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const gameName = (review.gameName || '').toLowerCase()
    const reviewText = (review.reviewText || '').toLowerCase()
    return gameName.includes(query) || reviewText.includes(query)
  })

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      // Find the review to get its gameId before deleting
      const reviewToDelete = userReviews.find((r: Review) => String(r.id) === reviewId)
      const result = await deleteReview(reviewId)
      return { result, gameId: reviewToDelete?.gameId }
    },
    onMutate: async (reviewId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['get-all-reviews-user', dbUserId] })

      // Find the review to get its gameId
      const reviewToDelete = userReviews.find((r: Review) => String(r.id) === reviewId)
      const gameId = reviewToDelete?.gameId

      // Snapshot the previous values
      const previousUserReviews = queryClient.getQueryData(['get-all-reviews-user', dbUserId])
      const previousGameReviews = gameId
        ? queryClient.getQueryData(['get-reviews-game', gameId])
        : undefined

      // Optimistically update user reviews
      queryClient.setQueryData(['get-all-reviews-user', dbUserId], (old: UserReviewsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          reviews: old.reviews.filter((r) => String(r.id) !== reviewId),
          totalCount: old.totalCount - 1
        }
      })

      // Optimistically update game reviews if we have the gameId
      if (gameId) {
        await queryClient.cancelQueries({ queryKey: ['get-reviews-game', gameId] })
        queryClient.setQueryData(['get-reviews-game', gameId], (old: Review[] | undefined) =>
          old?.filter((r) => String(r.id) !== reviewId) ?? []
        )
      }

      return { previousUserReviews, previousGameReviews, gameId }
    },
    onError: (error, _reviewId, context) => {
      // Rollback on error
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
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ['get-all-reviews-user', dbUserId] })
      if (context?.gameId) {
        queryClient.invalidateQueries({ queryKey: ['get-reviews-game', context.gameId] })
      }
    }
  })

  const handleDeleteReview = (reviewId: string) => {
    deleteMutation.mutate(reviewId)
  }

  // Like mutation with optimistic updates (no re-sorting)
  const likeMutation = useMutation({
    mutationFn: toggleReviewLike,
    onMutate: async (reviewId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['get-all-reviews-user', dbUserId] })

      // Snapshot the previous value
      const previousReviews = queryClient.getQueryData(['get-all-reviews-user', dbUserId])

      // Optimistically update the reviews (keep order stable)
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
      // Rollback on error
      if (context?.previousReviews) {
        queryClient.setQueryData(['get-all-reviews-user', dbUserId], context.previousReviews)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update like')
    },
  })

  const handleLikeReview = (reviewId: string) => {
    likeMutation.mutate(reviewId)
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-amber-400 p-6">
        <Navbar />
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-black font-bold">Loading profile...</div>
          </div>
        </div>
      </div>
    )
  }

  const user = data.user
  const initials = `${user.given_name?.[0] || ''}${user.family_name?.[0] || ''}`.toUpperCase()
  const reviewCount = totalReviewCount

  return (
    <div className="min-h-screen bg-amber-400 p-6 [background:url(assets/noise.svg)]">
      <Navbar />

      <div className="container mx-auto max-w-4xl mt-6">
        {/* Profile Header */}
        <div className="bg-sky-300 border-2 border-black rounded-xl p-8 mb-8">
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
              <Avatar className="w-24 h-24 border-4 border-black group-hover:opacity-80 transition-opacity">
                <AvatarImage
                  src={dbUserData?.account?.avatarUrl ? `/api/user/avatar/${dbUserData.account.id}` : undefined}
                  alt={user.given_name}
                />
                <AvatarFallback className="bg-lime-400 text-black text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarMutation.isPending ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-black text-black font-serif tracking-tight">
                {user.given_name} {user.family_name}
              </h1>
              {dbUserData?.account?.username && (
                <p className="text-zinc-700 text-sm font-medium mt-1">@{dbUserData.account.username}</p>
              )}
              <p className="text-black text-sm mt-1">{user.email}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <div className="bg-white border-2 border-black rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-black font-serif">{reviewCount}</div>
                  <div className="text-xs uppercase tracking-widest text-zinc-600">Reviews</div>
                </div>
                {/* Other stats can go here just a placeholder (Liked games, played games, watchlist, favorites) */}
                <div className="bg-white border-2 border-black rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-black font-serif">
                    <Gamepad2 className="w-6 h-6 inline" />
                  </div>
                  <div className="text-xs uppercase tracking-widest text-zinc-600 text-center">Gamer</div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="shrink-0">
              <Button
                asChild
                className="bg-rose-400 hover:bg-rose-500 text-black border-2 border-black font-bold px-6"
              >
                <a href='/api/logout'>Logout</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-[rgb(255,220,159)] border-2 border-black rounded-xl p-6">
          <h2 className="text-black text-sm font-bold uppercase tracking-widest border-b border-black pb-2 mb-4">
            Your Reviews
          </h2>

          {/* Search Bar */}
          {userReviews.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by game name or review..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border-2 border-black rounded-lg pl-10 pr-10 py-2 w-full focus:ring-2 focus:ring-sky-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <p className="text-zinc-600 text-sm mt-2">
                  Showing {filteredReviews.length} of {userReviews.length} reviews
                </p>
              )}
            </div>
          )}

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
            filteredReviews.length > 0 ? (
              <div className="space-y-4">
                {filteredReviews.map((review: Review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onDelete={handleDeleteReview}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === String(review.id)}
                    onLike={handleLikeReview}
                    isLiking={likeMutation.isPending && likeMutation.variables === String(review.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-black font-bold mb-2">No matching reviews</p>
                <p className="text-zinc-600 text-sm mb-4">
                  Try a different search term
                </p>
                <Button
                  onClick={() => setSearchQuery('')}
                  className="bg-sky-400 hover:bg-sky-500 text-black border-2 border-black font-bold"
                >
                  Clear Search
                </Button>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <Gamepad2 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <p className="text-black font-bold mb-2">No reviews yet</p>
              <p className="text-zinc-600 text-sm mb-4">
                Start playing games and share your thoughts!
              </p>
              <Button
                onClick={() => navigate({ to: '/' })}
                className="bg-green-500 hover:bg-green-600 text-black border-2 border-black font-bold"
              >
                Browse Games
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
