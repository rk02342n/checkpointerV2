import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getAllGamesQueryOptions, getTopRatedGamesQueryOptions, type Game } from "@/lib/gameQuery"
import { dbUserQueryOptions } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"
import FeaturedGames from "@/components/FeaturedGames"
import { FeaturedGamesSkeleton } from "@/components/custom-skeletons/FeaturedGamesSkeleton"
export const Route = createFileRoute("/")({
  component: Checkpointer,
})

export default function Checkpointer() {
  const { data, isPending } = useQuery(getAllGamesQueryOptions)
  const { data: topRatedData, isPending: isTopRatedPending } = useQuery(getTopRatedGamesQueryOptions)
  const { data: dbUserData, isError: isAuthError } = useQuery({
    ...dbUserQueryOptions,
    retry: false,
  })
  const isLoggedIn = !!dbUserData?.account && !isAuthError
  const navigate = useNavigate()

  const handleGameClick = (game: Game) => {
    window.scrollTo(0, 0)
    navigate({ to: `/games/${game.id}` })
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-7xl">
        {/* Hero Section */}
        <section className="mb-10 sm:mb-16">
          <div className="bg-secondary border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-5 sm:p-8 md:p-12 lg:p-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="inline-block bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-none border-2 border-border">
                  Game Tracking
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[0.95] font-alt text-secondary-foreground hover:opacity-80">
                  Checkpointer
                  <br />
                  {/* <span className="text-orange-300">pointer</span> */}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-secondary-foreground/70 max-w-md leading-relaxed">
                  Track, log, and review games as you play. Build your personal gaming history.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  {isLoggedIn ? (
                    <>
                      <Button
                        onClick={() => navigate({ to: '/browse' })}
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg"
                      >
                        Start Logging
                      </Button>
                      <Button
                        onClick={() => navigate({ to: '/browse' })}
                        variant="outline"
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg hover:bg-amber-50"
                      >
                        Browse Games
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        asChild
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg"
                      >
                        <a href="/api/login">Login</a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg"
                      >
                        <a href="/api/register">Sign Up</a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden md:block">
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

        {/* Stats Section */}
        {/* <section className="mb-10 sm:mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Games", value:  "10K+", color: "bg-amber-600/50" },
              { label: "Reviews", value: "1.2K+", color: "bg-red-600/50" },
              { label: "Users", value: "100+", color: "bg-green-600/50" },
              { label: "Logs", value: "5K+", color: "bg-blue-600/50" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`${stat.color} border-4 border-border p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)]`}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section> */}

        {/* Featured Games Section */}
        <section className="bg-muted border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-4 sm:p-6 md:p-10">
          {isPending ? (
            <FeaturedGamesSkeleton count={4} />
          ) : (
            <FeaturedGames
              title="Featured games"
              games={data.games}
              limit={4}
              onGameClick={handleGameClick}
            />
          )}
        </section>

        <br/>
        <br/>
        {/*Top Rated*/}
        <section className="bg-muted border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] p-4 sm:p-6 md:p-10">
          {!isTopRatedPending && topRatedData && (
            <FeaturedGames
              title="Top rated games"
              games={topRatedData.games}
              limit={4}
              onGameClick={handleGameClick}
            />)}
        </section>

        {/* CTA Section */}
        <section className="mt-10 sm:mt-16">
          <div className="bg-primary text-primary-foreground border-4 border-border p-5 sm:p-8 md:p-12 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
                  Ready to track your games?
                </h2>
                <p className="text-primary-foreground/80 mt-2 text-sm sm:text-base">
                  Join the community and start building your gaming history.
                </p>
              </div>
              {isLoggedIn ? (
                <Button
                  onClick={() => navigate({ to: '/browse' })}
                  variant="outline"
                  className="bg-card text-primary hover:bg-muted px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg w-full md:w-auto"
                >
                  Get Started
                </Button>
              ) : (
                <div className="flex gap-3 sm:gap-4 w-full md:w-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-card text-primary hover:bg-muted px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg flex-1 md:flex-none"
                  >
                    <a href="/api/login">Login</a>
                  </Button>
                  <Button
                    asChild
                    className="px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg flex-1 md:flex-none"
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
