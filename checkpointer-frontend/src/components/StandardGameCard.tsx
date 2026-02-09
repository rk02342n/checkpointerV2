import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Game } from "@/lib/gameQuery"
import { dbUserQueryOptions } from "@/lib/api"
import { addToWishlist, type WishlistResponse } from "@/lib/wantToPlayQuery"
import { LogGameModal } from "@/components/LogGameModal"
import { AddToListModal } from "@/components/AddToListModal"
import { EllipsisVertical, ListPlus, CalendarHeart, BookOpen, PenLine } from "lucide-react"
import { toast } from "sonner"

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const gameId = String(game.id)

  const [showLogModal, setShowLogModal] = useState(false)
  const [showAddToListModal, setShowAddToListModal] = useState(false)

  const { data: dbUserData } = useQuery({ ...dbUserQueryOptions, retry: false })
  const isLoggedIn = !!dbUserData?.account

  const wishlistMutation = useMutation({
    mutationFn: () => addToWishlist(gameId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['want-to-play-check', gameId] })
      await queryClient.cancelQueries({ queryKey: ['want-to-play'] })

      const previousWishlist = queryClient.getQueryData<WishlistResponse>(['want-to-play'])

      queryClient.setQueryData(['want-to-play-check', gameId], { inWishlist: true })

      if (previousWishlist) {
        queryClient.setQueryData(['want-to-play'], {
          wishlist: [
            {
              gameId: gameId,
              createdAt: new Date().toISOString(),
              gameName: game.name,
              gameCoverUrl: game.coverUrl,
              gameSlug: null,
            },
            ...previousWishlist.wishlist,
          ],
        })
      }

      return { previousWishlist }
    },
    onError: (_err, _, context) => {
      queryClient.setQueryData(['want-to-play-check', gameId], { inWishlist: false })
      if (context?.previousWishlist) {
        queryClient.setQueryData(['want-to-play'], context.previousWishlist)
      }
      toast.error("Failed to add to wishlist")
    },
    onSuccess: () => {
      toast.success(`${game.name} added to wishlist`)
    },
  })

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      toast.error("Please log in to add games to your wishlist")
      return
    }
    wishlistMutation.mutate()
  }

  const handleLog = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      toast.error("Please log in to log games")
      return
    }
    setShowLogModal(true)
  }

  const handleReview = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate({ to: "/games/$gameId", params: { gameId }, search: { review: true } })
  }

  const handleAddToList = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      toast.error("Please log in to add games to lists")
      return
    }
    setShowAddToListModal(true)
  }

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={() => onGameClick?.(game)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onGameClick?.(game) }}
      className={`${cardClasses[variant]} cursor-pointer`}
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
            ? "p-2 sm:p-4 border-t-2 sm:border-t-4 border-stone-900 relative"
            : "p-4 border-t-4 border-border relative"
        }
      >
        <h3
          className={
            variant === "featured"
              ? "font-semibold text-foreground text-sm sm:text-lg leading-tight truncate pr-6"
              : "font-semibold text-foreground truncate pr-6"
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
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className={
              variant === "featured"
                ? "absolute top-2 right-1 sm:top-3 sm:right-2 p-1 rounded-sm text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                : "absolute top-3 right-2 p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            <EllipsisVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem onClick={handleReview}>
              <PenLine className="size-4" />
              Review
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddToWishlist}>
              <CalendarHeart className="size-4" />
              Add to Wishlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLog}>
              <BookOpen className="size-4" />
              Log
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddToList}>
              <ListPlus className="size-4" />
              Add to List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <LogGameModal
      open={showLogModal}
      onOpenChange={setShowLogModal}
      preselectedGame={{
        id: gameId,
        name: game.name,
        coverUrl: game.coverUrl,
        releaseDate: game.releaseDate,
      }}
    />

    <AddToListModal
      open={showAddToListModal}
      onOpenChange={setShowAddToListModal}
      gameId={gameId}
      gameName={game.name}
      gameCoverUrl={game.coverUrl}
    />
    </>
  )
}
