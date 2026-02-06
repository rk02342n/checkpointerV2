import { type Game } from "@/lib/gameQuery"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { dbUserQueryOptions } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

function FeaturedGames({
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

  const { data: dbUserData, isError: isAuthError } = useQuery({
    ...dbUserQueryOptions,
    retry: false,
  })
  const isLoggedIn = !!dbUserData?.account && !isAuthError

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
          {title}
        </h2>
        {isLoggedIn ? (
          <Button
            type="button"
            onClick={() => navigate({ to: '/browse' })}
            className="mt-3 sm:mt-0"
          >
            Browse All
          </Button>
        ) : (
          <div className="flex gap-2 mt-3 sm:mt-0">
            <Button type="button" asChild>
              <a href="/api/login">Login</a>
            </Button>
            <Button type="button" asChild variant="outline">
              <a href="/api/register">Sign Up</a>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {items.slice(2, limit + 2).map((game: Game) => {
          const year = formatYear(game.releaseDate)
          return (
            <button
              key={game.id}
              onClick={() => onGameClick?.(game)}
              className="group text-left bg-white border-2 sm:border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] sm:shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] sm:hover:shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[1px] sm:hover:translate-x-[3px] hover:translate-y-[1px] sm:hover:translate-y-[3px] transition-all duration-100"
            >
              <div className="relative overflow-hidden">
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-full aspect-3/4 object-cover transition-all duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-3/4 bg-stone-200" />
                )}
                {year && (
                  <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-amber-400 text-stone-900 font-medium text-[10px] sm:text-xs rounded-none border sm:border-2 border-stone-900">
                    {year}
                  </Badge>
                )}
              </div>
              <div className="p-2 sm:p-4 border-t-2 sm:border-t-4 border-stone-900">
                <h3 className="font-semibold text-stone-900 text-sm sm:text-lg leading-tight truncate">
                  {game.name.split(':')[0]}
                </h3>
                {game.releaseDate !== null && (
                  <div className="mt-1 sm:mt-2 flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-stone-600">
                      {game.releaseDate instanceof Date
                        ? game.releaseDate.getFullYear()
                        : new Date(game.releaseDate).getFullYear()}
                    </span>
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

export default FeaturedGames;