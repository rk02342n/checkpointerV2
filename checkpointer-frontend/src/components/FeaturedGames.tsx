import { type Game } from "@/lib/gameQuery"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { dbUserQueryOptions } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { StandardGameCard } from "@/components/StandardGameCard"

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
        {items.slice(2, limit + 2).map((game: Game) => (
          <StandardGameCard key={game.id} game={game} onGameClick={onGameClick} />
        ))}
      </div>
    </section>
  )
}

export default FeaturedGames;