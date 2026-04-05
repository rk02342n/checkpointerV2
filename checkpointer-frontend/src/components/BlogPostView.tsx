import { Link } from '@tanstack/react-router'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { TiptapViewer } from '@/components/TiptapEditor'
import type { BlogPost, Embeds } from '@/lib/blogPostsQuery'

interface BlogPostViewProps {
  post: BlogPost
  author?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  embeds?: Embeds
}

export function BlogPostView({ post, author, embeds }: BlogPostViewProps) {
  return (
    <>
      {/* Header image */}
      {post.headerImageUrl && (
        <img
          src={`/api/blog-posts/${post.id}/header-image`}
          alt={post.title}
          className="w-full max-h-80 object-cover mb-6"
        />
      )}

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-sans">
        {post.title}
      </h1>
      {post.subtitle && (
        <p className="text-lg text-muted-foreground mt-2">{post.subtitle}</p>
      )}

      {/* Author + date */}
      <div className="flex items-center gap-3 mt-4">
        {author && (
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

        {post.publishedAt && (
          <span className="text-xs text-muted-foreground">
            {author && <span className="mr-1">&middot;</span>}
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="mt-6">
          <TiptapViewer
            content={post.content}
            embeds={embeds}
          />
        </div>
      )}
    </>
  )
}
