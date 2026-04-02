import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { publicBlogPostQueryOptions } from '@/lib/blogPostsQuery'
import { dbUserQueryOptions } from '@/lib/api'
import { useSettings } from '@/lib/settingsContext'
import Navbar from '@/components/Navbar'
import { BlogPostView } from '@/components/BlogPostView'
import { FileText } from 'lucide-react'

export const Route = createFileRoute('/blog/$postId')({
  component: BlogPostPage,
})

function BlogPostPage() {
  const { postId } = Route.useParams()
  const { data: dbUserData } = useQuery(dbUserQueryOptions)
  const { settings } = useSettings()
  const isAdmin = dbUserData?.account?.role === 'admin'
  const showBlogPosts = isAdmin || !!settings.blogPostsEnabled

  const { data, isPending, error } = useQuery({
    ...publicBlogPostQueryOptions(postId),
    enabled: showBlogPosts,
  })

  if (!showBlogPosts) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-foreground font-bold mb-2">Blog posts are not available</p>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar/>
        <div className="container mx-auto px-4 py-8 max-w-3xl animate-pulse">
          <div className="h-8 w-64 bg-muted-foreground/20 mb-3" />
          <div className="h-5 w-96 bg-muted-foreground/20 mb-4" />
          <div className="h-4 w-32 bg-muted-foreground/20 mb-8" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted-foreground/20" />
            <div className="h-4 w-full bg-muted-foreground/20" />
            <div className="h-4 w-2/3 bg-muted-foreground/20" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground font-alt mb-4">Post not found</h1>
          <p className="text-muted-foreground">This post may not exist or is no longer published.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <BlogPostView
          post={data.post}
          author={data.author}
          embeds={data.embeds}
        />
      </main>
    </div>
  )
}
