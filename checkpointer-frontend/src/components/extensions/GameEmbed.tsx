import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Link } from '@tanstack/react-router'
import { Gamepad2, X } from 'lucide-react'
import type { EmbedGame } from '@/lib/blogPostsQuery'

function GameEmbedView({ node, deleteNode, editor }: NodeViewProps) {
  const gameId = node.attrs.gameId as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const games = ((editor.storage as any).gameEmbed?.games ?? {}) as Record<string, EmbedGame>
  const game = games[gameId]
  const editable = editor.isEditable

  const card = (
    <div className={`flex items-center gap-3 p-3 bg-muted/30 border-2 border-border/30 ${!editable ? 'hover:bg-muted/60' : ''} transition-colors`}>
      {game?.coverUrl ? (
        <img
          src={game.coverUrl}
          alt={game.name}
          className="w-12 h-16 object-cover border-2 border-border"
        />
      ) : (
        <div className="w-12 h-16 bg-muted border-2 border-border flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1">
        {game ? (
          <p className="font-semibold text-foreground text-sm">{game.name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Game: {gameId}</p>
        )}
      </div>
      {editable && (
        <button onClick={deleteNode} className="p-1 hover:bg-destructive/10 rounded">
          <X className="w-4 h-4 text-destructive" />
        </button>
      )}
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
