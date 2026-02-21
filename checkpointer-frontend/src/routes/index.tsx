import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { usePostHog } from 'posthog-js/react'
import { Button } from "@/components/ui/button"
import { getFeaturedGamesQueryOptions, getTopRatedGamesQueryOptions, getTrendingGamesQueryOptions, type Game } from "@/lib/gameQuery"
import { dbUserQueryOptions } from "@/lib/api"
import { popularListsQueryOptions } from "@/lib/gameListsQuery"
import { useQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"
import FeaturedGames from "@/components/FeaturedGames"
import { FeaturedGamesSkeleton } from "@/components/custom-skeletons/FeaturedGamesSkeleton"
import { ListCarousel } from "@/components/ListCarousel"

export const Route = createFileRoute("/")({
  component: Checkpointer,
})

export default function Checkpointer() {
  const { data: featuredData, isPending } = useQuery(getFeaturedGamesQueryOptions)
  const { data: topRatedData, isPending: isTopRatedPending } = useQuery(getTopRatedGamesQueryOptions)
  const { data: trendingData, isPending: isTrendingPending } = useQuery(getTrendingGamesQueryOptions)
  const { data: popularListsData, isPending: areListsPending } = useQuery(popularListsQueryOptions)
  const { data: dbUserData, isError: isAuthError } = useQuery({
    ...dbUserQueryOptions,
    retry: false,
  })
  const isLoggedIn = !!dbUserData?.account && !isAuthError
  const navigate = useNavigate()
  const posthog = usePostHog()

  const handleGameClick = (game: Game) => {
    posthog.capture('game_clicked', { game_id: String(game.id), game_name: game.name, source: 'home' })
    window.scrollTo(0, 0)
    navigate({ to: `/games/${game.id}` })
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-7xl">
        {/* Hero Section */}
        <section className="mb-10 sm:mb-16">
          <div className="bg-secondary brightness-100 border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-5 sm:p-8 md:p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6 text-center sm:text-left">
                {/* Checks logo - mobile only */}
                <div className="sm:hidden">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-amber-100 border-4 border-border h-24 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                    <div className="bg-stone-900 border-4 border-border h-24 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                    <div className="bg-stone-900 border-4 border-border h-24 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                    <div className="bg-amber-100 border-4 border-border h-24 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight font-alt text-foreground hover:opacity-80">
                  Checkpointer
                </h2>
                <p className="text-sm sm:text-lg md:text-xl text-foreground/70 sm:max-w-md leading-relaxed mx-auto sm:mx-0">
                  Track, log, and review games as you play. Build your personal gaming history.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 items-center sm:items-start">
                  {isLoggedIn ? (
                    <>
                      <Button
                        onClick={() => { posthog.capture('cta_clicked', { button_name: 'start_logging' }); navigate({ to: '/browse' }); }}
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
                      >
                        Start Logging
                      </Button>
                      <Button
                        onClick={() => { posthog.capture('cta_clicked', { button_name: 'browse_games' }); navigate({ to: '/browse' }); }}
                        variant="outline"
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg hover:bg-amber-50 dark:hover:bg-muted w-full sm:w-auto"
                      >
                        Browse Games
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        asChild
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
                      >
                        <a href="/api/login">Login</a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
                      >
                        <a href="/api/register">Sign Up</a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-100 border-4 border-border h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  <div className="bg-stone-900 border-4 border-border h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  <div className="bg-stone-900 border-4 border-border h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                  <div className="bg-amber-100 border-4 border-border h-32 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Games Section */}
        <section className="bg-card border-4 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-4 sm:p-6 md:p-10">
          {isPending ? (
            <FeaturedGamesSkeleton count={4} />
          ) : featuredData ? (
            <FeaturedGames
              title="Featured games"
              games={featuredData.games}
              limit={4}
              onGameClick={handleGameClick}
            />
          ) : null}
        </section>

        <br/>
        <br/>
        {/* Trending This Week */}
        <section className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-4 sm:p-6 md:p-10">
          {isTrendingPending ? (
            <FeaturedGamesSkeleton count={4} />
          ) : trendingData && trendingData.games.length > 0 ? (
            <FeaturedGames
              title="Trending this week"
              games={trendingData.games}
              limit={4}
              onGameClick={handleGameClick}
            />
          ) : null}
        </section>

        <br/>
        <br/>
        {/*Top Rated*/}
        <section className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-4 sm:p-6 md:p-10">
          {!isTopRatedPending && topRatedData && (
            <FeaturedGames
              title="Top rated on Checkpointer"
              games={topRatedData.games}
              limit={4}
              onGameClick={handleGameClick}
            />)}
        </section>

        {/* Popular Lists */}
        {/* {popularListsData && popularListsData.lists.length > 0 && (
          <>
            <br/>
            <br/>
            <section className="bg-muted border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-4 sm:p-6 md:p-10">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-alt text-foreground">Popular Lists</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularListsData.lists.map((list: PopularGameListSummary) => (
                  <div key={list.id} className="relative">
                    <GameListCard list={list} showSaveButton />
                    <div className="absolute top-2 left-2 z-10 bg-stone-900/80 text-white text-xs font-medium px-2 py-0.5">
                      @{list.ownerUsername}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )} */}
        {!areListsPending && popularListsData
         && <ListCarousel gameList={popularListsData?.lists}/>}

        {/* CTA Section */}
        <section className="mt-10 sm:mt-16">
          <div className="bg-blue-400/80 text-foreground border-4 border-border p-5 sm:p-8 md:p-12 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
                  Ready to track your games?
                </h2>
                <p className="text-foreground/80 mt-2 text-sm sm:text-base">
                  Join the community and start building your gaming history.
                </p>
              </div>
              {isLoggedIn ? (
                <Button
                  onClick={() => { posthog.capture('cta_clicked', { button_name: 'get_started' }); navigate({ to: '/browse' }); }}
                  variant="outline"
                  className="bg-card text-foreground hover:bg-muted px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg w-full md:w-auto"
                >
                  Get Started
                </Button>
              ) : (
                <div className="flex gap-3 sm:gap-4 w-full md:w-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-card text-foreground hover:bg-muted px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg flex-1 md:flex-none"
                  >
                    <a href="/api/login">Login</a>
                  </Button>
                  <Button
                    asChild
                    className="bg-card text-foreground hover:bg-muted px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg flex-1 md:flex-none"
                  >
                    <a href="/api/register">Sign Up</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
