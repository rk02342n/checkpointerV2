import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Gamepad2, Calendar, Trash2, Heart, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/StarRating'
import type { WishlistItem } from '@/lib/wantToPlayQuery'
import type { SessionStatus } from '@/lib/gameSessionsQuery'

export type Review = {
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

type ReviewCardProps = {
  review: Review
  onDelete?: (id: string) => void
  isDeleting?: boolean
  onLike: (id: string) => void
  isLiking: boolean
}

export const ReviewCard = memo(function ReviewCard({ review, onDelete, isDeleting, onLike, isLiking }: ReviewCardProps) {
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
            {onDelete && (
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
            )}
          </div>
        </div>
      </div>
    </Link>
  )
})

// Format duration between two dates
function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt)
  const end = endedAt ? new Date(endedAt) : new Date()
  const diffMs = end.getTime() - start.getTime()

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

type SessionCardProps = {
  session: {
    session: {
      id: string
      startedAt: string
      endedAt: string | null
      status?: SessionStatus | null
    }
    game: {
      id: string
      name: string
      coverUrl: string | null
    }
  }
}

export const SessionCard = memo(function SessionCard({ session }: SessionCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const isActive = !session.session.endedAt
  const duration = formatDuration(session.session.startedAt, session.session.endedAt)

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: session.game.id }}
      className="block bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all p-4"
    >
      <div className="flex gap-4">
        {/* Game Cover */}
        <div className="shrink-0">
          {session.game.coverUrl ? (
            <img
              src={session.game.coverUrl}
              alt={session.game.name}
              className="w-16 h-20 object-cover border-2 border-stone-900"
            />
          ) : (
            <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-stone-500" />
            </div>
          )}
        </div>

        {/* Session Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-stone-900 font-bold truncate" title={session.game.name}>
                {session.game.name}
              </h4>
              <div className="flex items-center gap-1 text-stone-600 text-xs mt-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(session.session.startedAt)}</span>
              </div>
            </div>
            {isActive ? (
              <span className="bg-green-400 text-stone-900 px-2 py-1 text-xs font-bold uppercase border-2 border-stone-900">
                Playing Now
              </span>
            ) : session.session.status === 'finished' ? (
              <span className="bg-green-200 text-green-800 px-2 py-1 text-xs font-medium border-2 border-stone-900">
                Finished
              </span>
            ) : session.session.status === 'stashed' ? (
              <span className="bg-amber-200 text-amber-800 px-2 py-1 text-xs font-medium border-2 border-stone-900">
                Stashed
              </span>
            ) : (
              <span className="bg-stone-200 text-stone-700 px-2 py-1 text-xs font-medium border-2 border-stone-900">
                Ended
              </span>
            )}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 mt-auto pt-2 border-t-2 border-stone-200">
            <Clock className="w-4 h-4 text-stone-500" />
            <span className="text-stone-700 text-sm font-medium">
              {isActive ? `Playing for ${duration}` : duration}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
})

type WishlistCardProps = {
  item: WishlistItem
  onRemove?: (gameId: string) => void
  isRemoving?: boolean
}

export const WishlistCard = memo(function WishlistCard({ item, onRemove, isRemoving }: WishlistCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: item.gameId }}
      className={`block bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all p-4 ${isRemoving ? 'opacity-50' : ''}`}
    >
      <div className="flex gap-4">
        {/* Game Cover */}
        <div className="shrink-0">
          {item.gameCoverUrl ? (
            <img
              src={item.gameCoverUrl}
              alt={item.gameName}
              className="w-16 h-20 object-cover border-2 border-stone-900"
            />
          ) : (
            <div className="w-16 h-20 bg-stone-200 border-2 border-stone-900 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-stone-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-stone-900 font-bold truncate" title={item.gameName}>
                {item.gameName}
              </h4>
              <div className="flex items-center gap-1 text-stone-600 text-xs mt-1">
                <Calendar className="w-3 h-3" />
                <span>Added {formatDate(item.createdAt)}</span>
              </div>
            </div>
            <span className="bg-amber-200 text-amber-800 px-2 py-1 text-xs font-medium border-2 border-stone-900">
              Want to Play
            </span>
          </div>

          {/* Actions */}
          {onRemove && (
            <div className="flex justify-end items-center gap-2 mt-auto pt-2 border-t-2 border-stone-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(item.gameId)
                }}
                disabled={isRemoving}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-100 p-1 h-auto"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                <span className="text-xs">Remove</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
})
