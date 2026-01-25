import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { userQueryOptions, dbUserQueryOptions } from '@/lib/api'
import { getReviewsByUserIdQueryOptions } from '@/lib/reviewsQuery'
import { getGameByIdQueryOptions, type Game } from '@/lib/gameQuery'
import { Gamepad2, Calendar, User as UserIcon } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
})

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
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
}

function ReviewCard({ review }: { review: Review }) {
  const { data: gameData, isPending: gamePending } = useQuery(
    getGameByIdQueryOptions(review.gameId)
  )

  const game: Game | null = gameData?.game || null

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-amber-200 rounded-xl border-2 border-black p-4 hover:bg-amber-300 transition-colors">
      <div className="flex gap-4">
        {/* Game Cover */}
        <div className="shrink-0">
          {gamePending ? (
            <div className="w-16 h-20 bg-zinc-300 rounded-lg border border-black animate-pulse" />
          ) : game?.coverUrl ? (
            <img
              src={game.coverUrl}
              alt={game?.name || 'Game cover'}
              className="w-16 h-20 object-cover rounded-lg border border-black"
            />
          ) : (
            <div className="w-16 h-20 bg-zinc-200 rounded-lg border border-black flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-zinc-500" />
            </div>
          )}
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              {gamePending ? (
                <div className="h-5 w-32 bg-zinc-300 rounded animate-pulse" />
              ) : (
                <h4 className="text-black font-bold font-serif truncate">
                  {game?.name || 'Unknown Game'}
                </h4>
              )}
              {review.createdAt && (
                <div className="flex items-center gap-1 text-zinc-600 text-xs mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              )}
            </div>
            <StarRating rating={review.rating} size="sm" />
          </div>

          {review.reviewText && (
            <p className="text-black text-sm font-sans line-clamp-3">
              "{review.reviewText}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Profile() {
  const navigate = useNavigate()
  const { isPending, error, data } = useQuery(userQueryOptions)
  const { isPending: isUserPending, data: dbUserData } = useQuery(dbUserQueryOptions)

  // Get user's reviews - using the database user ID (not Kinde ID)
  const dbUserId = dbUserData?.account?.id || ''
  const { data: userReviews = [], isPending: reviewsPending } = useQuery({
    ...getReviewsByUserIdQueryOptions(dbUserId),
    enabled: !!dbUserId && !isUserPending
  })

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

  if (error) {
    return (
      <div className="min-h-screen bg-amber-400 p-6">
        <Navbar />
        <div className="container mx-auto max-w-4xl">
          <div className="bg-red-200 border-2 border-black rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-black mb-2">Not Logged In</h2>
            <p className="text-black mb-4">Please log in to view your profile.</p>
            <Button asChild className="bg-green-500 hover:bg-green-600 text-black border-2 border-black font-bold">
              <a href="/api/login">Login</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const user = data.user
  const initials = `${user.given_name?.[0] || ''}${user.family_name?.[0] || ''}`.toUpperCase()
  const reviewCount = Array.isArray(userReviews) ? userReviews.length : 0

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
                src={user.picture}
                alt={user.given_name}
              />
              <AvatarFallback className="bg-lime-400 text-black text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

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
                <div className="bg-white border-2 border-black rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-black font-serif">
                    <Gamepad2 className="w-6 h-6 inline" />
                  </div>
                  <div className="text-xs uppercase tracking-widest text-zinc-600">Gamer</div>
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
          <h2 className="text-black text-sm font-bold uppercase tracking-widest border-b border-black pb-2 mb-6">
            Your Reviews
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
          ) : Array.isArray(userReviews) && userReviews.length > 0 ? (
            <div className="space-y-4">
              {userReviews.map((review: Review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
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
