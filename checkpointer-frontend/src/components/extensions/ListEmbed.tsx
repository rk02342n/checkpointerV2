import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Link } from '@tanstack/react-router'
import { ListPlus, X } from 'lucide-react'
import type { EmbedList } from '@/lib/blogPostsQuery'

function ListEmbedView({ node, deleteNode, editor }: NodeViewProps) {
  const listId = node.attrs.listId as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lists = ((editor.storage as any).listEmbed?.lists ?? {}) as Record<string, EmbedList>
  const list = lists[listId]
  const editable = editor.isEditable

  const card = (
    <div className={`flex items-center gap-3 p-3 bg-muted/30 border-2 border-border/30 ${!editable ? 'hover:bg-muted/60' : ''} transition-colors`}>
      {list?.coverUrl ? (
        <img
          src={list.coverUrl}
          alt={list.name}
          className="w-12 h-12 object-cover border-2 border-border"
        />
      ) : (
        <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center">
          <ListPlus className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1">
        {list ? (
          <>
            <p className="font-semibold text-foreground text-sm">{list.name}</p>
            {list.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{list.description}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">List: {listId}</p>
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
