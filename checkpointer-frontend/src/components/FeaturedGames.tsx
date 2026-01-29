import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <section className="space-y-2 w-full rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between px-4 sm:px-6 lg:px-10">
        <div className="space-y-1 bg-white p-2 hover:border-2 border-black border-2 mb-0">
          <h2 className="text-md font-bold uppercase tracking-widest text-black px-4">
            {title}
          </h2>
        </div>
        <Button
          type="button"
          variant="pop"
          size="sm"
          onClick={() => navigate({ to: '/browse' })}
        >
          Browse
        </Button>
      </div>
      <br/>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-6 lg:px-10 w-full">
        {(items.slice(2, limit + 2)).map((game: Game) => {
          const rating = formatRating(game.igdbRating)
          const year = formatYear(game.releaseDate)
          return (
            <Card
              key={game.id}
              className="relative mx-auto w-full bg-amber-100 max-w-sm pt-0 outline-4 outline-black border-black rounded-none hover:outline-8 active:border-4 active:border-black"
            >
              <button
                onClick={() => onGameClick?.(game)}
                className="text-left w-full"
              >
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl}
                      alt={game.name}
                      className="relative z-20 aspect-9/16 w-full object-cover h-48 sm:h-64 md:h-80"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 z-30 aspect-video bg-black/35 h-48 sm:h-64 md:h-80" />
                  )}

                <CardHeader className="px-4 py-4">
                  <CardAction>
                    {rating !== null ? (
                      <Badge
                        variant="secondary"
                        className="border border-black bg-amber-200 text-black"
                      >
                        {year}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-black text-black"
                      >
                        New
                      </Badge>
                    )}
                  </CardAction>
                  <CardTitle className="text-black p-0">{game.name.split(':')[0]}</CardTitle>
                </CardHeader>
              </button>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function GameCardSkeleton() {
  return (
    <Card className="relative mx-auto w-full bg-amber-100 max-w-sm pt-0 outline-4 outline-black border-black rounded-none">
      <Skeleton className="aspect-9/16 w-full h-48 sm:h-64 md:h-80 rounded-none bg-amber-200" />
      <CardHeader className="px-4 py-4">
        <CardAction>
          <Skeleton className="h-5 w-12 rounded-full bg-amber-200" />
        </CardAction>
        <Skeleton className="h-6 w-3/4 bg-amber-200" />
      </CardHeader>
    </Card>
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
    <section className="space-y-2 w-full rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between px-4 sm:px-6 lg:px-10">
        <div className="space-y-1 bg-white p-2 hover:border-2 border-black border-2 mb-0">
          <h2 className="text-md font-bold uppercase tracking-widest text-black px-4">
            {title}
          </h2>
        </div>
        <Button type="button" variant="pop" size="sm" disabled>
          Browse
        </Button>
      </div>
      <br />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-6 lg:px-10 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}
