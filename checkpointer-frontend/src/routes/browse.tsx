import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { useInfiniteQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { browseGames, type Game, type BrowseGamesParams } from "@/lib/gameQuery"

type SortBy = "rating" | "year" | "name"
type SortOrder = "asc" | "desc"

const ITEMS_PER_PAGE = 24

function getYear(dateStr: string | Date | null): string {
  if (!dateStr) return "N/A"
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  const y = d.getFullYear()
  return Number.isFinite(y) ? y.toString() : "N/A"
}

function formatRating(value: Game["igdbRating"]): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return null
  return Math.round(n)
}

export const Route = createFileRoute("/browse")({
  component: BrowseGames,
})

export default function BrowseGames() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("rating")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [genreFilter, setGenreFilter] = useState<string>("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")

  const navigate = useNavigate()

  const {
    data,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['browse-games-infinite', { q: searchQuery || undefined, sortBy, sortOrder, year: yearFilter !== "all" ? yearFilter : undefined, genre: genreFilter !== "all" ? genreFilter : undefined, platform: platformFilter !== "all" ? platformFilter : undefined }],
    queryFn: async ({ pageParam = 0 }) => {
      const params: BrowseGamesParams = {
        q: searchQuery || undefined,
        sortBy,
        sortOrder,
        year: yearFilter !== "all" ? yearFilter : undefined,
        genre: genreFilter !== "all" ? genreFilter : undefined,
        platform: platformFilter !== "all" ? platformFilter : undefined,
        limit: ITEMS_PER_PAGE,
        offset: pageParam,
      }
      return browseGames(params)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.offset + lastPage.pagination.limit
      }
      return undefined
    },
    staleTime: 1000 * 60 * 2,
  })

  const allGames = data?.pages.flatMap(page => page.games) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0
  const years = data?.pages[0]?.years ?? []
  const genres = data?.pages[0]?.genres ?? []
  const platforms = data?.pages[0]?.platforms ?? []

  const handleGameClick = (game: Game) => {
    window.scrollTo(0, 0)
    navigate({ to: `/games/${game.id}` })
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold">
            Browse Games
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Discover your next adventure
          </p>
        </div>

        {/* Search & Filters Section */}
        <section className="bg-secondary border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-6 mb-8">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border-4 border-border py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border rounded-none"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-secondary-foreground">
                Sort:
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split("-") as [SortBy, SortOrder]
                  setSortBy(newSortBy)
                  setSortOrder(newSortOrder)
                }}
                className="bg-input border-4 border-border px-3 py-2 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-border rounded-none"
              >
                <option value="rating-desc">Rating (High to Low)</option>
                <option value="rating-asc">Rating (Low to High)</option>
                <option value="year-desc">Year (Newest)</option>
                <option value="year-asc">Year (Oldest)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-secondary-foreground">
                Year:
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-input border-4 border-border px-3 py-2 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-border rounded-none"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Genre Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-secondary-foreground">
                Genre:
              </label>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="bg-input border-4 border-border px-3 py-2 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-border rounded-none"
              >
                <option value="all">All Genres</option>
                {genres.map(genre => (
                  <option key={genre.id} value={genre.slug}>{genre.name}</option>
                ))}
              </select>
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-secondary-foreground">
                Platform:
              </label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-input border-4 border-border px-3 py-2 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-border rounded-none"
              >
                <option value="all">All Platforms</option>
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.slug}>{platform.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm font-medium text-muted-foreground">
            {isPending ? (
              "Loading games..."
            ) : error ? (
              "Error loading games"
            ) : (
              `Showing ${allGames.length} of ${totalCount} games`
            )}
          </p>
        </div>

        {/* Game Grid */}
        <section className="bg-muted border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] p-6">
          {isPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-rose-600">
                Failed to load games. Please try again.
              </p>
            </div>
          ) : allGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-muted-foreground">
                No games found matching your criteria
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allGames.map((game) => {
                  const rating = formatRating(game.igdbRating)
                  const year = getYear(game.releaseDate)

                  return (
                    <button
                      key={game.id}
                      onClick={() => handleGameClick(game)}
                      className="group text-left bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
                    >
                      <div className="relative overflow-hidden">
                        {game.coverUrl ? (
                          <img
                            src={game.coverUrl}
                            alt={game.name}
                            className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-48 sm:h-56 bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No Image</span>
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground font-medium text-xs rounded-none border-2 border-border">
                          {year}
                        </Badge>
                      </div>

                      <div className="p-4 border-t-4 border-border">
                        <h3 className="font-semibold text-foreground truncate">
                          {game.name.split(':')[0]}
                        </h3>
                        {rating !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-2 flex-1 bg-muted border border-border">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${rating}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{rating}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Load More Button */}
              {hasNextPage && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-8 py-3"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalCount - allGames.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function GameCardSkeleton() {
  return (
    <div className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)]">
      <Skeleton className="w-full h-48 sm:h-56 rounded-none bg-muted" />
      <div className="p-4 border-t-4 border-border">
        <Skeleton className="h-5 w-3/4 bg-muted rounded-none" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-2 flex-1 bg-muted rounded-none" />
          <Skeleton className="h-4 w-8 bg-muted rounded-none" />
        </div>
      </div>
    </div>
  )
}
