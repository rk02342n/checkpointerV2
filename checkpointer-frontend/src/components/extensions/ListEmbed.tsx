import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Link } from '@tanstack/react-router'
import { ListPlus, X, Gamepad2, User } from 'lucide-react'
import type { EmbedList } from '@/lib/blogPostsQuery'

function ListEmbedView({ node, deleteNode, editor }: NodeViewProps) {
  const listId = node.attrs.listId as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lists = ((editor.storage as any).listEmbed?.lists ?? {}) as Record<string, EmbedList>
  const list = lists[listId]
  const editable = editor.isEditable

  const card = (
    <div className={`bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] ${!editable ? 'hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(120,113,108,0.5)] hover:translate-x-[2px] hover:translate-y-[2px]' : ''} transition-all`}>
      <div className="flex gap-4 p-4">
        {/* Cover image */}
        <div className="shrink-0">
          {list?.coverUrl ? (
            <img
              src={`/api/game-lists/${list.id}/cover`}
              alt={list.name}
              className="w-40 object-cover border-2 border-border"
            />
          ) : (
            <div className="w-30 h-30 bg-muted border-2 border-border flex items-center justify-center">
              <ListPlus className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {list ? (
            <>
              <h4 className="text-foreground font-bold truncate pr-6">{list.name}</h4>
              {list.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{list.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 border-2 border-border flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3" />
                  {list.gameCount} {list.gameCount === 1 ? 'game' : 'games'}
                </span>
                {list.ownerUsername && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {list.ownerDisplayName || list.ownerUsername}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">List: {listId}</p>
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
      {!editable && list ? (
        <Link to="/lists/$listId" params={{ listId: list.id }}>
          {card}
        </Link>
      ) : (
        card
      )}
    </NodeViewWrapper>
  )
}

export const ListEmbed = Node.create({
  name: 'listEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      listId: { default: null },
    }
  },

  addStorage() {
    return {
      lists: {} as Record<string, EmbedList>,
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-list-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-list-embed': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ListEmbedView)
  },
})
