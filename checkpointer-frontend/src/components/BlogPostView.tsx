import { Link } from '@tanstack/react-router'
import { Gamepad2, ListPlus } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import type { BlogPost, BlogPostBlock } from '@/lib/blogPostsQuery'

interface BlogPostViewProps {
  post: BlogPost
  blocks: BlogPostBlock[]
  author?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  isPreview?: boolean
}

export function BlogPostView({ post, blocks, author, isPreview }: BlogPostViewProps) {
  return (
    <div>
      {/* Header image */}
      {post.headerImageUrl && (
        <img
          src={`/api/blog-posts/${post.id}/header-image`}
          alt={post.title}
          className="w-full max-h-80 object-cover"
        />
      )}

      {/* Title section */}
      <div className="p-6 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-alt">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="text-lg text-muted-foreground mt-2">{post.subtitle}</p>
        )}

        <div className="flex items-center gap-3 mt-4">
          {/* Author info */}
          {author && !isPreview && (
            <Link
              to="/users/$userId"
              params={{ userId: author.id }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-7 h-7 border-2 border-border">
                <AvatarImage
                  src={
                    author.avatarUrl
                      ? author.avatarUrl.startsWith('http')
                        ? author.avatarUrl
                        : `/api/user/avatar/${author.id}?v=${encodeURIComponent(author.avatarUrl)}`
                      : undefined
                  }
                />
                <AvatarFallback className="text-xs font-bold">
                  {(author.displayName || author.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-foreground">
                {author.displayName || author.username}
              </span>
            </Link>
          )}

          {/* Published date */}
          {post.publishedAt && (
            <span className="text-xs text-muted-foreground">
              {author && !isPreview && <span className="mr-1">&middot;</span>}
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Blocks */}
      {blocks.length > 0 && (
        <div className="px-6 pb-6 space-y-4">
          {blocks.map((block) => (
            <PublicBlock key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  )
}

function PublicBlock({ block }: { block: BlogPostBlock }) {
  if (block.blockType === 'text' && block.content) {
    return (
      <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
        {block.content}
      </div>
    )
  }

  if (block.blockType === 'image') {
    return (
      <div>
        {block.imageUrl && (
          <img
            src={`/api/blog-posts/${block.postId}/blocks/${block.id}/image`}
            alt={block.imageCaption || 'Post image'}
            className="w-full max-h-96 object-contain bg-muted/30 border-2 border-border/30"
          />
        )}
        {block.imageCaption && (
          <p className="text-xs text-muted-foreground mt-1 italic">{block.imageCaption}</p>
        )}
      </div>
    )
  }

  if (block.blockType === 'game_embed' && block.game) {
    return (
      <Link
        to="/games/$gameId"
        params={{ gameId: block.game.id }}
        className="flex items-center gap-3 p-3 bg-muted/30 border-2 border-border/30 hover:bg-muted/60 transition-colors"
      >
        {block.game.coverUrl ? (
          <img
            src={block.game.coverUrl}
            alt={block.game.name}
            className="w-12 h-16 object-cover border-2 border-border"
          />
        ) : (
          <div className="w-12 h-16 bg-muted border-2 border-border flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground text-sm">{block.game.name}</p>
        </div>
      </Link>
    )
  }

  if (block.blockType === 'list_embed' && block.list) {
    return (
      <Link
        to="/lists/$listId"
        params={{ listId: block.list.id }}
        className="flex items-center gap-3 p-3 bg-muted/30 border-2 border-border/30 hover:bg-muted/60 transition-colors"
      >
        {block.list.coverUrl ? (
          <img
            src={block.list.coverUrl}
            alt={block.list.name}
            className="w-12 h-12 object-cover border-2 border-border"
          />
        ) : (
          <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center">
            <ListPlus className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground text-sm">{block.list.name}</p>
          {block.list.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{block.list.description}</p>
          )}
        </div>
      </Link>
    )
  }

  return null
}
