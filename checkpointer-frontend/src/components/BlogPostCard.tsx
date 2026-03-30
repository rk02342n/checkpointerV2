import { Link } from "@tanstack/react-router"
import { Calendar, FileText } from "lucide-react"
import type { BlogPost, BlogPostBlock } from "@/lib/blogPostsQuery"

interface BlogPostCardProps {
  post: BlogPost
  blocks?: BlogPostBlock[]
  themed?: boolean
}

function getTextSnippet(blocks: BlogPostBlock[]): string | null {
  const textBlock = blocks.find((b) => b.blockType === "text" && b.content)
  if (!textBlock?.content) return null
  const plain = textBlock.content.replace(/<[^>]*>/g, "").trim()
  return plain.length > 120 ? plain.slice(0, 120) + "..." : plain
}

export function BlogPostCard({ post, blocks, themed }: BlogPostCardProps) {
  const snippet = post.subtitle || (blocks ? getTextSnippet(blocks) : null)

  return (
    <Link
      to="/blog/$postId"
      params={{ postId: post.id }}
      className={`block bg-card profile-card ${themed ? "profile-card-hover" : "hover:bg-background"} border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] active:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all p-4`}
    >
      <div className="flex gap-4">
        {/* Post content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="min-w-0">
            <h4 className="text-foreground font-bold truncate">{post.title}</h4>
            {post.publishedAt && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
          {snippet && (
            <p className="text-foreground/80 text-sm line-clamp-2 mt-2 flex-1">
              {snippet}
            </p>
          )}
        </div>

        {/* Thumbnail */}
        <div className="shrink-0">
          {post.headerImageUrl ? (
            <img
              src={`/api/blog-posts/${post.id}/header-image`}
              alt={post.title}
              className="w-46 aspect-video object-cover border-none rounded-md"
              loading="lazy"
            />
          ) : (
            <div className="w-28 aspect-video bg-muted border-2 border-border flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
