import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Game } from "@/lib/gameQuery"
import { useNavigate } from "@tanstack/react-router"


function formatRating(value: Game["igdbRating"]) {
  if (value === null || value === undefined) return null
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return null
  return Math.round(n)
}

function formatYear(value: Game["releaseDate"]) {
  if (!value) return null
  const d = typeof value === "string" ? new Date(value) : value
  const y = d.getFullYear()
  return Number.isFinite(y) ? y : null
}

export function FeaturedGames({
  title = "Featured games",
  games = [],
  limit = 4,
  onGameClick,
} : {
  title?: string
  games?: Game[]
  limit?: number
  onGameClick?: (game: Game) => void
}) {
  const items = games
  const navigate = useNavigate()

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-stone-900">
          {title}
        </h2>
        <Button
          type="button"
          onClick={() => navigate({ to: '/browse' })}
          className="mt-4 sm:mt-0"
        >
          Browse All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(items.slice(2, limit + 2)).map((game: Game) => {
          const rating = formatRating(game.igdbRating)
          const year = formatYear(game.releaseDate)
          return (
            <button
              key={game.id}
              onClick={() => onGameClick?.(game)}
              className="group text-left bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] hover:shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-100"
            >
              <div className="relative overflow-hidden">
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-full h-56 sm:h-64 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-56 sm:h-64 bg-stone-200" />
                )}
                {year && (
                  <Badge className="absolute top-3 right-3 bg-amber-400 text-stone-900 font-medium text-xs rounded-none border-2 border-stone-900">
                    {year}
                  </Badge>
                )}
              </div>
              <div className="p-4 border-t-4 border-stone-900">
                <h3 className="font-semibold text-stone-900 text-lg leading-tight truncate">
                  {game.name.split(':')[0]}
                </h3>
                {rating !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 w-full bg-stone-200 border border-stone-900">
                      <div
                        className="h-full bg-orange-300"
                        style={{ width: `${rating}%` }}
                      />
                    </div>
                    <span className="text-sm text-stone-600">{rating}</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function GameCardSkeleton() {
  return (
    <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)]">
      <Skeleton className="w-full h-56 sm:h-64 rounded-none bg-stone-100" />
      <div className="p-4 border-t-4 border-stone-900">
        <Skeleton className="h-6 w-3/4 bg-stone-100 rounded-none" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-2 w-full bg-orange-50 rounded-none" />
          <Skeleton className="h-4 w-8 bg-stone-100 rounded-none" />
        </div>
      </div>
    </div>
  )
}

export function FeaturedGamesSkeleton({
  title = "Featured games",
  count = 4,
}: {
  title?: string
  count?: number
}) {
  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-stone-900">
          {title}
        </h2>
        <div className="mt-4 sm:mt-0 bg-orange-200 px-6 py-2 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Skeleton className="h-5 w-20 bg-orange-300 rounded-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}
