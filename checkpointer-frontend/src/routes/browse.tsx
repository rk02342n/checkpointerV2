import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { usePostHog } from 'posthog-js/react'
import { Search } from "lucide-react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { StandardGameCard } from "@/components/StandardGameCard"
import { browseGames, getBrowseFiltersQueryOptions, type Game, type BrowseGamesParams } from "@/lib/gameQuery"
import { useDebounce } from "@/lib/useDebounce"
import { BrowsePagination } from "@/components/BrowsePagination"

type SortBy = "rating" | "year" | "name"
type SortOrder = "asc" | "desc"

const ITEMS_PER_PAGE = 24

const VALID_SORT_BY = ["rating", "year", "name"] as const
const VALID_SORT_ORDER = ["asc", "desc"] as const

interface BrowseSearchParams {
  q?: string
  page?: number
  sortBy?: SortBy
  sortOrder?: SortOrder
  year?: string
  genre?: string
  platform?: string
}

export const Route = createFileRoute("/browse")({
  component: BrowseGames,
  validateSearch: (search: Record<string, unknown>): BrowseSearchParams => {
    const q = typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined
    const rawPage = Number(search.page)
    const page = Number.isInteger(rawPage) && rawPage > 1 ? rawPage : undefined
    const sortBy = VALID_SORT_BY.includes(search.sortBy as SortBy) && search.sortBy !== "rating"
      ? (search.sortBy as SortBy)
      : undefined
    const sortOrder = VALID_SORT_ORDER.includes(search.sortOrder as SortOrder) && search.sortOrder !== "desc"
      ? (search.sortOrder as SortOrder)
      : undefined
    const year = typeof search.year === "string" && search.year ? search.year : undefined
    const genre = typeof search.genre === "string" && search.genre ? search.genre : undefined
    const platform = typeof search.platform === "string" && search.platform ? search.platform : undefined

    return { q, page, sortBy, sortOrder, year, genre, platform }
  },
})

export default function BrowseGames() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const posthog = usePostHog()

  // Apply defaults for values not in URL
  const currentPage = search.page ?? 1
  const sortBy: SortBy = search.sortBy ?? "rating"
  const sortOrder: SortOrder = search.sortOrder ?? "desc"
  const yearFilter = search.year ?? "all"
  const genreFilter = search.genre ?? "all"
  const platformFilter = search.platform ?? "all"

  // Local state for responsive search input
  const [searchInput, setSearchInput] = useState(search.q ?? "")
  const debouncedSearch = useDebounce(searchInput, 300)

  // Sync local input when URL q changes externally (back/forward navigation)
  useEffect(() => {
    setSearchInput(search.q ?? "")
  }, [search.q])

  // Helper to update URL search params, stripping defaults to keep URLs clean
  const updateSearch = useCallback(
    (updates: Partial<BrowseSearchParams>, options?: { replace?: boolean }) => {
      navigate({
        from: "/browse",
        search: (prev: BrowseSearchParams) => {
          const next = { ...prev, ...updates }
          // Strip default values to keep URL clean
          if (!next.q) next.q = undefined
          if (!next.page || next.page <= 1) next.page = undefined
          if (next.sortBy === "rating") next.sortBy = undefined
          if (next.sortOrder === "desc") next.sortOrder = undefined
          if (!next.year || next.year === "all") next.year = undefined
          if (!next.genre || next.genre === "all") next.genre = undefined
          if (!next.platform || next.platform === "all") next.platform = undefined
          return next
        },
        replace: options?.replace ?? false,
      })
    },
    [navigate]
  )

  // Sync debounced search value to URL
  useEffect(() => {
    const urlQ = search.q ?? ""
    if (debouncedSearch !== urlQ) {
      updateSearch({ q: debouncedSearch || undefined, page: undefined }, { replace: true })
    }
    if (debouncedSearch) {
      posthog.capture('browse_searched', { query: debouncedSearch, sort_by: sortBy, filters: { year: yearFilter, genre: genreFilter, platform: platformFilter } })
    }
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build query params from URL state (using debounced search for API)
  const queryParams: BrowseGamesParams = {
    q: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    year: yearFilter !== "all" ? yearFilter : undefined,
    genre: genreFilter !== "all" ? genreFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  }

  const {
    data,
    isPending,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['browse-games', queryParams],
    queryFn: () => browseGames(queryParams),
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  })

  const { data: filtersData } = useQuery(getBrowseFiltersQueryOptions)

  const games = data?.games ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const years = filtersData?.years ?? []
  const genres = filtersData?.genres ?? []
  const platforms = filtersData?.platforms ?? []

  const handleGameClick = (game: Game) => {
    posthog.capture('game_clicked', { game_id: String(game.id), game_name: game.name, source: 'browse' })
    window.scrollTo(0, 0)
    navigate({ to: `/games/${game.id}` })
  }

  const handlePageChange = (page: number) => {
    window.scrollTo(0, 0)
    updateSearch({ page })
  }

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-") as [SortBy, SortOrder]
    posthog.capture('browse_filter_changed', { filter_type: 'sort', value })
    updateSearch({ sortBy: newSortBy, sortOrder: newSortOrder, page: undefined }, { replace: true })
  }

  const handleYearChange = (value: string) => {
    posthog.capture('browse_filter_changed', { filter_type: 'year', value })
    updateSearch({ year: value === "all" ? undefined : value, page: undefined }, { replace: true })
  }

  const handleGenreChange = (value: string) => {
    posthog.capture('browse_filter_changed', { filter_type: 'genre', value })
    updateSearch({ genre: value === "all" ? undefined : value, page: undefined }, { replace: true })
  }

  const handlePlatformChange = (value: string) => {
    posthog.capture('browse_filter_changed', { filter_type: 'platform', value })
    updateSearch({ platform: value === "all" ? undefined : value, page: undefined }, { replace: true })
  }

  const rangeStart = totalCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
                onChange={(e) => handleSortChange(e.target.value)}
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
                onChange={(e) => handleYearChange(e.target.value)}
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
                onChange={(e) => handleGenreChange(e.target.value)}
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
                onChange={(e) => handlePlatformChange(e.target.value)}
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
            ) : totalCount > 0 ? (
              `Showing ${rangeStart}-${rangeEnd} of ${totalCount} games`
            ) : (
              "No games found"
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
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-muted-foreground">
                No games found matching your criteria
              </p>
            </div>
          ) : (
            <>
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity ${
                  isFetching && !isPending ? "opacity-60" : "opacity-100"
                }`}
              >
                {games.map((game) => (
                  <StandardGameCard
                    key={game.id}
                    game={game}
                    variant="browse"
                    onGameClick={handleGameClick}
                  />
                ))}
              </div>

              <BrowsePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={ITEMS_PER_PAGE}
                isFetching={isFetching}
                onPageChange={handlePageChange}
              />
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
