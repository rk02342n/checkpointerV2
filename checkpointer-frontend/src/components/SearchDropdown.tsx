import { useRef, useState } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface SearchDropdownItem {
  id: string | number
  name: string
  imageUrl: string | null
  secondary?: string | null
}

interface SearchDropdownProps {
  query: string
  onQueryChange: (q: string) => void
  items: SearchDropdownItem[]
  isLoading: boolean
  isError?: boolean
  onSelect: (item: SearchDropdownItem) => void
  placeholder?: string
  fallbackIcon?: React.ReactNode
  emptyMessage?: string
  errorMessage?: string
  className?: string
  autoFocus?: boolean
  onEscape?: () => void
  onClose?: () => void
  showDropdown?: boolean
}

export function SearchDropdown({
  query,
  onQueryChange,
  items,
  isLoading,
  isError,
  onSelect,
  placeholder = 'Search...',
  fallbackIcon,
  emptyMessage = 'No results found.',
  errorMessage = 'Error searching. Please try again.',
  className,
  autoFocus,
  onEscape,
  onClose,
  showDropdown: showDropdownProp,
}: SearchDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasFocus, setHasFocus] = useState(false)

  const showDropdown =
    hasFocus && (showDropdownProp ?? query.trim().length > 0)

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setHasFocus(false)
          onEscape?.()
        }
      }}
    >
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onEscape?.()
          }
        }}
        autoFocus={autoFocus}
        className="w-full bg-input border-4 border-border text-foreground py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-border text-sm rounded-none"
      />
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
      {onClose && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClose() }}
          className="absolute right-3 top-2.5 text-muted-foreground hover:bg-red-400 hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] overflow-hidden max-h-64 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-rose-600 text-sm">
              {errorMessage}
            </div>
          ) : items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(item)
                }}
                className="flex items-center justify-start gap-3 p-3 hover:bg-primary/20 border-b-2 border-border/30 last:border-b-0 cursor-pointer transition-colors"
              >
                {item.imageUrl ? (
                  <img
                    className="w-10 h-10 object-cover border-2 border-border"
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center">
                    {fallbackIcon ?? (
                      <Search className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex flex-col justify-start items-start flex-1 min-w-0">
                  <div className="text-foreground text-sm font-semibold truncate w-full">
                    {item.name}
                  </div>
                  {item.secondary && (
                    <div className="text-muted-foreground text-xs">
                      {item.secondary}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
