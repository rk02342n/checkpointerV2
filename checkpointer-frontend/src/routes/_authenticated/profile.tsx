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
      className={`block bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all p-4 ${isDeleting ? 'opacity-50' : ''}`}
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

          {/* Actions: Like & Delete */}
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

  const handleDeleteReview = (reviewId: string) => {
    deleteMutation.mutate(reviewId)
  }

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

  const handleLikeReview = (reviewId: string) => {
    likeMutation.mutate(reviewId)
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 text-stone-900 selection:bg-orange-300/30">
      <Navbar />

      <div className="container mx-auto max-w-4xl px-6 py-8">
        {/* Profile Header */}
        <div className="bg-orange-100 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 mb-8">
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
              {dbUserData?.account?.username && (
                <p className="text-stone-700 text-sm font-medium mt-1">@{dbUserData.account.username}</p>
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

            {/* Logout Button */}
            <div className="shrink-0">
              <Button
                asChild
                variant="destructive"
                className="px-6"
              >
                <a href='/api/logout'>Logout</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 border-stone-900 pb-2 mb-4">
            Your Reviews
          </h2>

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
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-stone-900 bg-stone-200 mt-16">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold text-xl text-stone-900">
              Checkpointer
            </div>
            <div className="text-sm text-stone-500">
              Track games. Share reviews. Build history.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
