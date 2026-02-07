import { Badge } from "@/components/ui/badge"
import { type Game } from "@/lib/gameQuery"

type Variant = "featured" | "browse"

function formatYear(value: Game["releaseDate"]) {
  if (!value) return null
  const d = typeof value === "string" ? new Date(value) : value
  const y = d.getFullYear()
  return Number.isFinite(y) ? y : null
}

interface StandardGameCardProps {
  game: Game
  onGameClick?: (game: Game) => void
  variant?: Variant
}

const cardClasses: Record<Variant, string> = {
  featured:
    "group text-left bg-white dark:bg-stone-900 border-2 sm:border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] sm:shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] sm:hover:shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] hover:translate-x-px sm:hover:translate-x-[3px] hover:translate-y-px sm:hover:translate-y-[3px] transition-all duration-100",
  browse:
    "group text-left bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100",
}

export const StandardGameCard = ({
  game,
  onGameClick,
  variant = "featured",
}: StandardGameCardProps) => {
  const year = formatYear(game.releaseDate)
  const platforms = game.platforms ?? []

  return (
    <button
      onClick={() => onGameClick?.(game)}
      className={cardClasses[variant]}
    >
      <div className="relative overflow-hidden">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.name}
            className={
              variant === "featured"
                ? "w-full aspect-3/4 object-cover transition-all duration-300"
                : "w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-300"
            }
            loading="lazy"
          />
        ) : variant === "featured" ? (
          <div className="w-full aspect-3/4 bg-stone-200" />
        ) : (
          <div className="w-full h-48 sm:h-56 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Image</span>
          </div>
        )}
        {(variant === "browse" || year !== null) && (
          <Badge
            className={
              variant === "featured"
                ? "absolute top-2 right-2 sm:top-3 sm:right-3 bg-amber-400 text-stone-900 font-medium text-[10px] sm:text-xs rounded-none border sm:border-2 border-stone-900"
                : "absolute top-2 right-2 bg-primary text-primary-foreground font-medium text-xs rounded-none border-2 border-border"
            }
          >
            {year ?? "N/A"}
          </Badge>
        )}
      </div>
      <div
        className={
          variant === "featured"
            ? "p-2 sm:p-4 border-t-2 sm:border-t-4 border-stone-900"
            : "p-4 border-t-4 border-border"
        }
      >
        <h3
          className={
            variant === "featured"
              ? "font-semibold text-foreground text-sm sm:text-lg leading-tight truncate"
              : "font-semibold text-foreground truncate"
          }
        >
          {game.name.split(':')[0]}
        </h3>
        {platforms.length > 0 && (
          <div
            className={
              variant === "featured"
                ? "mt-1 sm:mt-2 flex flex-wrap gap-1"
                : "mt-2 flex flex-wrap gap-1"
            }
          >
            {platforms.slice(0, 4).map((p) => (
              <Badge
                key={p.id}
                variant="outline"
                className={
                  variant === "featured"
                    ? "text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 rounded-none border border-stone-300 text-stone-600 dark:bg-stone-700 dark:text-stone-200 font-normal"
                    : "text-[10px] px-1.5 py-0 rounded-none border border-stone-300 font-normal text-stone-600 dark:bg-stone-700 dark:text-stone-200"
                }
              >
                {p.abbreviation || p.name}
              </Badge>
            ))}
            {platforms.length > 4 && (
              <span
                className={
                  variant === "featured"
                    ? "text-[9px] sm:text-[10px] text-stone-400"
                    : "text-[10px] text-muted-foreground"
                }
              >
                +{platforms.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
