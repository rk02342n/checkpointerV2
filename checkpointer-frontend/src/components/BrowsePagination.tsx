import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BrowsePaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  isFetching: boolean
  onPageChange: (page: number) => void
}

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
}: BrowsePaginationProps) {
  if (totalPages <= 1) return null

  const rangeStart = (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalCount)
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isFetching}
          className="border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] disabled:opacity-50 rounded-none"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>

        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground font-bold select-none">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              onClick={() => onPageChange(page)}
              disabled={isFetching}
              className={`min-w-[40px] border-4 border-border rounded-none ${
                page === currentPage
                  ? "shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] dark:shadow-[1px_1px_0px_0px_rgba(120,113,108,0.5)] translate-x-[2px] translate-y-[2px]"
                  : "shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)]"
              }`}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isFetching}
          className="border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] disabled:opacity-50 rounded-none"
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
