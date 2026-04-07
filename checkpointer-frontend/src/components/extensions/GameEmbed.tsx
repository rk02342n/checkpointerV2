import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Link } from '@tanstack/react-router'
import { Gamepad2, X } from 'lucide-react'
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

  const card = (
    <div className={`bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] ${!editable ? 'hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] hover:translate-x-[2px] hover:translate-y-[2px]' : ''} transition-all p-4`}>
      <div className="flex gap-4 items-start">
        {/* Cover image */}
        <div className="shrink-0">
          {game?.coverUrl ? (
            <img
              src={game.coverUrl}
              alt={game.name}
              className="w-22 h-30 object-cover border-2 border-border"
            />
          ) : (
            <div className="w-22 h-30 bg-muted border-2 border-border flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {game ? (
            <>
              <h4 className="text-foreground font-bold truncate pr-6">{game.name}</h4>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {year && (
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 border-2 border-border">
                    {year}
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
  draggable: true,

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
