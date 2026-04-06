import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import {
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  blogPostQueryOptions,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  uploadHeaderImage,
  removeHeaderImage,
} from '@/lib/blogPostsQuery'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import { getTiptapExtensions, TiptapToolbar, TiptapViewer } from '@/components/TiptapEditor'

export const Route = createFileRoute('/_authenticated/blog-editor/$postId')({
  component: BlogEditorPage,
})

function BlogEditorPage() {
  const { postId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isPending, isError } = useQuery(blogPostQueryOptions(postId))
  const post = data?.post
  const embeds = data?.embeds

  // ── Preview toggle ──
  const [showPreview, setShowPreview] = useState(false)

  // ── Tiptap editor ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saving, setSaving] = useState(false)

  const saveContent = useMutation({
    mutationFn: (content: JSONContent) => updateBlogPost(postId, { content }),
    onMutate: () => setSaving(true),
    onSettled: () => setSaving(false),
    onError: (err) => toast.error(err.message),
  })

  const editor = useEditor({
    extensions: getTiptapExtensions(),
    content: post?.content || undefined,
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert prose-headings:font-sans max-w-none focus:outline-none min-h-[200px]',
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveContent.mutate(editor.getJSON())
      }, 1500)
    },
  }, [post?.id])

  // Sync embed data into extension storage
  useEffect(() => {
    if (editor && embeds) {
      editor.storage.gameEmbed.games = embeds.games
      editor.storage.listEmbed.lists = embeds.lists
    }
  }, [editor, embeds])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // ── Auto-discard empty drafts on leave ──
  const postRef = useRef(post)
  useEffect(() => { postRef.current = post }, [post])

  useEffect(() => {
    return () => {
      const p = postRef.current
      if (!p) return
      const isEmpty =
        p.status === 'draft' &&
        (!p.title || p.title.trim() === '') &&
        !p.subtitle &&
        !p.headerImageUrl &&
        !p.content
      if (isEmpty) {
        deleteBlogPost(p.id).catch(() => {})
      }
    }
  }, [])

  // ── Post metadata local state ──
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [slug, setSlug] = useState('')
  const initializedRef = useRef(false)

  useEffect(() => {
    if (post && !initializedRef.current) {
      setTitle(post.title)
      setSubtitle(post.subtitle ?? '')
      setSlug(post.slug)
      initializedRef.current = true
    }
  }, [post])

  // ── Save metadata (auto-save on blur) ──
  const saveMeta = useMutation({
    mutationFn: (data: { title?: string; subtitle?: string | null; slug?: string }) =>
      updateBlogPost(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleMetaBlur = useCallback(() => {
    if (!post) return
    const updates: Record<string, string | null> = {}
    if (title !== post.title) updates.title = title
    if (subtitle !== (post.subtitle ?? '')) updates.subtitle = subtitle || null
    if (slug !== post.slug) updates.slug = slug
    if (Object.keys(updates).length > 0) {
      saveMeta.mutate(updates)
    }
  }, [post, title, subtitle, slug, saveMeta])

  // ── Publish / Unpublish ──
  const publishMutation = useMutation({
    mutationFn: () => publishBlogPost(postId),
    onSuccess: () => {
      toast.success('Post published!')
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishBlogPost(postId),
    onSuccess: () => {
      toast.success('Post reverted to draft')
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  // ── Delete post ──
  const deletePostMutation = useMutation({
    mutationFn: () => deleteBlogPost(postId),
    onSuccess: () => {
      toast.success('Post deleted')
      navigate({ to: '/profile', search: { tab: 'posts' } })
    },
    onError: (err) => toast.error(err.message),
  })

  // ── Header image ──
  const headerImageRef = useRef<HTMLInputElement>(null)

  const uploadHeaderMutation = useMutation({
    mutationFn: (file: File) => uploadHeaderImage(postId, file),
    onSuccess: () => {
      toast.success('Header image uploaded')
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  const removeHeaderMutation = useMutation({
    mutationFn: () => removeHeaderImage(postId),
    onSuccess: () => {
      toast.success('Header image removed')
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  const handleHeaderImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadHeaderMutation.mutate(file)
    if (headerImageRef.current) headerImageRef.current.value = ''
  }

  // ── Loading / Error ──
  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar sticky={false} />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar sticky={false} />
        <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h1 className="text-2xl font-bold text-foreground font-sans mb-4">Post not found</h1>
          <Button variant="outline" onClick={() => navigate({ to: '/profile' })}>
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Button>
        </div>
      </div>
    )
  }

  const isPublished = post.status === 'published'

  return (
    <div className="min-h-screen bg-background">
      <Navbar sticky={false} />

      {/* ── Top bar: nav + toolbar + actions ── */}
      <div className="sticky top-0 z-30 bg-card border-b-4 border-border mx-4">
        <div className="container mx-auto max-w-3xl px-4 py-3">
          {/* Row 1: Back | actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/profile', search: { tab: 'posts' } })}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="flex items-center gap-2">
              {/* Preview toggle */}
              <Button
                variant={showPreview ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="border-4 border-border"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">{showPreview ? 'Edit' : 'Preview'}</span>
              </Button>

              {/* Save indicator */}
              {(saveMeta.isPending || saving) && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}

              {/* Publish toggle */}
              {isPublished ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unpublishMutation.mutate()}
                  disabled={unpublishMutation.isPending}
                  className="border-4 border-border"
                >
                  {unpublishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Unpublish</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white border-4 border-border"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Publish</span>
                </Button>
              )}

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this post? This cannot be undone.')) {
                    deletePostMutation.mutate()
                  }
                }}
                disabled={deletePostMutation.isPending}
                className="border-4 border-border"
              >
                {deletePostMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Row 2: formatting toolbar (edit mode only) */}
          {!showPreview && editor && (
            <div className="mt-3 pt-3 border-t-2 border-border/20">
              <TiptapToolbar editor={editor} postId={postId} />
            </div>
          )}
        </div>
      </div>

      {/* ── Main content area ── */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {showPreview ? (
          <>
            {/* Header image */}
            {post.headerImageUrl && (
              <img
                src={`/api/blog-posts/${post.id}/header-image`}
                alt={post.title}
                className="w-full max-h-80 object-cover mb-6"
              />
            )}

            {/* Title / Subtitle */}
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-sans">{post.title}</h1>
            {post.subtitle && <p className="text-lg text-muted-foreground mt-2">{post.subtitle}</p>}

            {/* Content */}
            {post.content && (
              <div className="mt-6">
                <TiptapViewer content={post.content} embeds={embeds} />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Status badge */}
            <div className="mb-6">
              <span
                className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest border-4 border-border ${
                  isPublished
                    ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                }`}
              >
                {isPublished ? 'Published' : 'Draft'}
              </span>
              {post.publishedAt && (
                <span className="ml-3 text-xs text-muted-foreground">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Header image */}
            <section className="mb-8">
              {post.headerImageUrl ? (
                <div className="relative group overflow-hidden">
                  <img
                    src={`/api/blog-posts/${postId}/header-image`}
                    alt="Header"
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white/30"
                      onClick={() => removeHeaderMutation.mutate()}
                      disabled={removeHeaderMutation.isPending}
                    >
                      {removeHeaderMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => headerImageRef.current?.click()}
                  disabled={uploadHeaderMutation.isPending}
                  className="w-full h-36 border-4 border-dashed border-border/50 hover:border-border bg-muted/30 hover:bg-muted/60 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {uploadHeaderMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-semibold">Add header image</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={headerImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleHeaderImageChange}
              />
            </section>

            {/* Title / Subtitle / Slug */}
            <section className="mb-6 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                autoFocus
                onBlur={handleMetaBlur}
                className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-foreground font-sans placeholder:text-muted-foreground/40 focus:outline-none border-b-4 border-transparent focus:border-border pb-2 transition-colors"
              />
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle (optional)..."
                onBlur={handleMetaBlur}
                className="w-full bg-transparent text-lg text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none border-b-2 border-transparent focus:border-border/50 pb-1 transition-colors"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Slug</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-post-slug"
                  onBlur={handleMetaBlur}
                  className="flex-1 bg-transparent text-sm text-foreground font-mono placeholder:text-muted-foreground/30 focus:outline-none border-b-2 border-transparent focus:border-border/50 pb-0.5 transition-colors"
                />
              </div>
            </section>

            {/* Tiptap editor content — flows seamlessly after title */}
            {editor && <EditorContent editor={editor} />}
          </>
        )}
      </main>
    </div>
  )
}
