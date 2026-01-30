import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getAllGamesQueryOptions, type Game } from "@/lib/gameQuery"
import { useQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/")({
  component: Checkpointer,
})

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

function BrutalistFeaturedGames({
  title = "Featured games",
  games = [],
  limit = 4,
  onGameClick,
}: {
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
        {items.slice(2, limit + 2).map((game: Game) => {
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
                    className="w-full h-56 sm:h-64 object-cover group-hover:scale-105 transition-all duration-300"
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

function BrutalistGameCardSkeleton() {
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

function BrutalistFeaturedGamesSkeleton({
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
        <div className="mt-4 sm:mt-0 bg-orange-50 px-6 py-2 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Skeleton className="h-5 w-20 bg-orange-300 rounded-none" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <BrutalistGameCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

export default function Checkpointer() {
  const { data, isPending } = useQuery(getAllGamesQueryOptions)
  const navigate = useNavigate()

  const handleGameClick = (game: Game) => {
    window.scrollTo(0, 0)
    navigate({ to: `/games/${game.id}` })
  }

  return (
    <div className="min-h-screen bg-linear-to-br bg-rose-50 text-stone-900 selection:bg-green-300">
      <Navbar />

      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="bg-sky-300 border-4 border-stone-900 shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] p-8 md:p-12 lg:p-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="inline-block bg-orange-300 text-white px-3 py-1 text-xs font-semibold rounded-none border-2 border-stone-900">
                  Game Tracking
                </div>
                <h2 className="text-4xl md:text-3xl lg:text-5xl font-bold leading-[0.95] font-serif">
                  Checkpointer
                  <br />
                  {/* <span className="text-orange-300">pointer</span> */}
                </h2>
                <p className="text-lg md:text-xl text-stone-600 max-w-md leading-relaxed">
                  Track, log, and review games as you play. Build your personal gaming history.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={() => navigate({ to: '/browse' })}
                    className="px-8 py-6 text-lg"
                  >
                    Start Logging
                  </Button>
                  <Button
                    onClick={() => navigate({ to: '/browse' })}
                    variant="outline"
                    className="px-8 py-6 text-lg"
                  >
                    Browse Games
                  </Button>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-100 border-4 border-stone-900 h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  <div className="bg-black border-4 border-stone-900 h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  <div className="bg-black border-4 border-stone-900 h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  <div className="bg-amber-100 border-4 border-stone-900 h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Games", value: data?.games?.length || "---", color: "bg-orange-50" },
              { label: "Reviews", value: "1.2K+", color: "bg-amber-100" },
              { label: "Users", value: "500+", color: "bg-rose-100" },
              { label: "Logs", value: "5K+", color: "bg-sky-100" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`${stat.color} border-4 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]`}
              >
                <div className="text-3xl md:text-4xl font-bold text-stone-900">
                  {stat.value}
                </div>
                <div className="text-sm text-stone-600 font-medium mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Games Section */}
        <section className="bg-white border-4 border-stone-900 shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] p-6 md:p-10">
          {isPending ? (
            <BrutalistFeaturedGamesSkeleton count={4} />
          ) : (
            <BrutalistFeaturedGames
              games={data.games}
              limit={8}
              onGameClick={handleGameClick}
            />
          )}
        </section>

        {/* CTA Section */}
        <section className="mt-16">
          <div className="bg-orange-300 text-white border-4 border-stone-900 p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(41,37,36,1)]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Ready to track your games?
                </h2>
                <p className="text-orange-50 mt-2">
                  Join the community and start building your gaming history.
                </p>
              </div>
              <Button
                onClick={() => navigate({ to: '/browse' })}
                variant="outline"
                className="bg-white text-orange-400 hover:bg-stone-50 px-8 py-6 text-lg"
              >
                Get Started
              </Button>
            </div>
          </div>
        </section>
      </main>

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
