import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Link } from '@tanstack/react-router'
import { Gamepad2, X, Star } from 'lucide-react'
import type { EmbedGame } from '@/lib/blogPostsQuery'

function formatYear(value: string | null) {
  if (!value) return null
  const y = new Date(value).getFullYear()
  return Number.isFinite(y) ? y : null
}

function GameEmbedView({ node, deleteNode, editor }: NodeViewProps) {
  const gameId = node.attrs.gameId as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const games = ((editor.storage as any).gameEmbed?.games ?? {}) as Record<string, EmbedGame>
  const game = games[gameId]
  const editable = editor.isEditable

  const year = game ? formatYear(game.releaseDate) : null
  const rating = game?.igdbRating ? parseFloat(game.igdbRating) : null

  const card = (
    <div className={`flex items-stretch bg-card border-4 border-border shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] dark:shadow-[3px_3px_0px_0px_rgba(120,113,108,0.5)] overflow-hidden ${!editable ? 'hover:shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(120,113,108,0.5)] hover:translate-x-[2px] hover:translate-y-[2px]' : ''} transition-all`}>
      {/* Cover image */}
      {game?.coverUrl ? (
        <img
          src={game.coverUrl}
          alt={game.name}
          className="w-20 h-28 object-cover border-r-4 border-border shrink-0"
        />
      ) : (
        <div className="w-20 h-28 bg-muted border-r-4 border-border flex items-center justify-center shrink-0">
          <Gamepad2 className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 p-3 flex flex-col justify-center min-w-0 relative">
        {game ? (
          <>
            <p className="font-bold text-foreground text-sm leading-tight truncate pr-6">{game.name}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {year && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 border-2 border-border">
                  {year}
                </span>
              )}
              {rating !== null && rating > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {(rating / 10).toFixed(1)}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Game: {gameId}</p>
        )}
        {editable && (
          <button onClick={deleteNode} className="absolute top-2 right-2 p-1 hover:bg-destructive/10 rounded">
            <X className="w-4 h-4 text-destructive" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <NodeViewWrapper className="my-3">
      {!editable && game ? (
        <Link to="/games/$gameId" params={{ gameId: game.id }}>
          {card}
        </Link>
      ) : (
        card
      )}
    </NodeViewWrapper>
  )
}

export const GameEmbed = Node.create({
  name: 'gameEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      gameId: { default: null },
    }
  },

  addStorage() {
    return {
      games: {} as Record<string, EmbedGame>,
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-game-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-game-embed': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(GameEmbedView)
  },
})
