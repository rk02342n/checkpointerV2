import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface BrowsePaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  isFetching: boolean
  onPageChange: (page: number) => void
  onPrefetchPage?: (page: number) => void
}

// Wait for the pointer/focus to linger before prefetching, so a mouse sweep
// across the bar cancels the timer instead of firing a request per button.
const HOVER_INTENT_MS = 120

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = [1]

  if (currentPage > 3) {
    pages.push("ellipsis")
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis")
  }

  pages.push(totalPages)

  return pages
}

export function BrowsePagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  isFetching,
  onPageChange,
  onPrefetchPage,
}: BrowsePaginationProps) {
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPrefetch = () => {
    if (prefetchTimer.current) {
      clearTimeout(prefetchTimer.current)
      prefetchTimer.current = null
    }
  }

  // Schedule a prefetch after a brief hover/focus dwell; a new schedule or a
  // leave/blur clears the pending one.
  const schedulePrefetch = (page: number) => {
    if (!onPrefetchPage) return
    cancelPrefetch()
    prefetchTimer.current = setTimeout(() => onPrefetchPage(page), HOVER_INTENT_MS)
  }

  useEffect(() => cancelPrefetch, [])

  if (totalPages <= 1) return null

  const rangeStart = (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalCount)
  const pages = getPageNumbers(currentPage, totalPages)

  const hoverProps = (page: number) => ({
    onMouseEnter: () => schedulePrefetch(page),
    onFocus: () => schedulePrefetch(page),
    onMouseLeave: cancelPrefetch,
    onBlur: cancelPrefetch,
  })

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          {...hoverProps(currentPage - 1)}
          disabled={currentPage <= 1 || isFetching}
          className="border-border disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>

        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-foreground font-bold select-none">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              onClick={() => onPageChange(page)}
              {...hoverProps(page)}
              disabled={isFetching}
              className={`min-w-[40px] border-border`}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          {...hoverProps(currentPage + 1)}
          disabled={currentPage >= totalPages || isFetching}
          className="border-border disabled:opacity-50"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        Showing {rangeStart}-{rangeEnd} of {totalCount} games
      </p>
    </div>
  )
}
