import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  Type,
  Gamepad2,
  List,
  Eye,
  EyeOff,
  ArrowLeft,
  Upload,
  X,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  blogPostQueryOptions,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  addBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  uploadHeaderImage,
  removeHeaderImage,
  uploadBlockImage,
  type BlogPostBlock,
  type BlockType,
} from '@/lib/blogPostsQuery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Navbar from '@/components/Navbar'

export const Route = createFileRoute('/_authenticated/blog-editor/$postId')({
  component: BlogEditorPage,
})

// ── Block type config ──
const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
  { type: 'image', label: 'Image', icon: <ImagePlus className="w-4 h-4" /> },
  { type: 'game_embed', label: 'Game', icon: <Gamepad2 className="w-4 h-4" /> },
  { type: 'list_embed', label: 'List', icon: <List className="w-4 h-4" /> },
]

function BlogEditorPage() {
  const { postId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isPending, isError } = useQuery(blogPostQueryOptions(postId))
  const post = data?.post
  const blocks = data?.blocks ?? []

  // ── Post metadata local state ──
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [slug, setSlug] = useState('')
  const [metaDirty, setMetaDirty] = useState(false)

  useEffect(() => {
    if (post) {
      setTitle(post.title)
      setSubtitle(post.subtitle ?? '')
      setSlug(post.slug)
      setMetaDirty(false)
    }
  }, [post])

  // Track changes to metadata
  useEffect(() => {
    if (!post) return
    const changed =
      title !== post.title ||
      subtitle !== (post.subtitle ?? '') ||
      slug !== post.slug
    setMetaDirty(changed)
  }, [title, subtitle, slug, post])

  // ── Save metadata ──
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
      navigate({ to: '/profile' })
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

  // ── Add block ──
  const addBlockMutation = useMutation({
    mutationFn: (blockType: BlockType) => addBlock(postId, { blockType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  // ── Block reorder ──
  const reorderMutation = useMutation({
    mutationFn: (blockIds: string[]) => reorderBlocks(postId, blockIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  const moveBlock = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const newBlocks = [...blocks]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= newBlocks.length) return
      ;[newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]]
      reorderMutation.mutate(newBlocks.map((b) => b.id))
    },
    [blocks, reorderMutation]
  )

  // ── Manual save ���─
  const handleManualSave = () => {
    if (!metaDirty) return
    const updates: Record<string, string | null> = {}
    if (title !== post?.title) updates.title = title
    if (subtitle !== (post?.subtitle ?? '')) updates.subtitle = subtitle || null
    if (slug !== post?.slug) updates.slug = slug
    if (Object.keys(updates).length > 0) {
      saveMeta.mutate(updates, {
        onSuccess: () => toast.success('Saved!'),
      })
    }
  }

  // ── Loading / Error ──
  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h1 className="text-2xl font-bold text-foreground font-alt mb-4">Post not found</h1>
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
      <Navbar />

      {/* ── Editor toolbar ── */}
      <div className=" top-16 z-30 bg-card border-b-4 border-border mx-4 right-0">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/profile' })}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex items-center gap-2">
            {/* Save indicator */}
            {saveMeta.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            {metaDirty && !saveMeta.isPending && (
              <Button variant="ghost" size="sm" onClick={handleManualSave}>
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
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
      </div>

      {/* ── Main editor area ── */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
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

        {/* ── Header image ── */}
        <section className="mb-8">
          {post.headerImageUrl ? (
            <div className="relative group border-4 border-border overflow-hidden">
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

        {/* ── Title / Subtitle / Slug ── */}
        <section className="mb-10 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-foreground font-alt placeholder:text-muted-foreground/40 focus:outline-none border-b-4 border-transparent focus:border-border pb-2 transition-colors"
          />
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtitle (optional)..."
            className="w-full bg-transparent text-lg text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none border-b-2 border-transparent focus:border-border/50 pb-1 transition-colors"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-post-slug"
              className="flex-1 bg-transparent text-sm text-foreground font-mono placeholder:text-muted-foreground/30 focus:outline-none border-b-2 border-transparent focus:border-border/50 pb-0.5 transition-colors"
            />
          </div>
        </section>

        {/* ── Blocks ── */}
        <section className="space-y-4 mb-10">
          {blocks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Type className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No blocks yet</p>
              <p className="text-xs mt-1">Add your first block below to start writing</p>
            </div>
          )}

          {blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              postId={postId}
              index={index}
              totalBlocks={blocks.length}
              onMove={moveBlock}
            />
          ))}
        </section>

        {/* ── Add block bar ── */}
        <section className="border-4 border-dashed border-border/40 p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
            Add Block
          </p>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map(({ type, label, icon }) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => addBlockMutation.mutate(type)}
                disabled={addBlockMutation.isPending}
                className="border-4 border-border"
              >
                {icon}
                {label}
              </Button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

// ── Individual Block Editor ──
function BlockEditor({
  block,
  postId,
  index,
  totalBlocks,
  onMove,
}: {
  block: BlogPostBlock
  postId: string
  index: number
  totalBlocks: number
  onMove: (index: number, direction: 'up' | 'down') => void
}) {
  const queryClient = useQueryClient()

  // ── Block content state ──
  const [content, setContent] = useState(block.content ?? '')
  const [caption, setCaption] = useState(block.imageCaption ?? '')
  const [embedId, setEmbedId] = useState(block.gameId ?? block.listId ?? '')
  const blockImageRef = useRef<HTMLInputElement>(null)

  // Sync from server
  useEffect(() => {
    setContent(block.content ?? '')
    setCaption(block.imageCaption ?? '')
    setEmbedId(block.gameId ?? block.listId ?? '')
  }, [block.content, block.imageCaption, block.gameId, block.listId])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateBlock(postId, block.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
      toast.success('Block saved')
    },
    onError: (err) => toast.error(err.message),
  })

  // ── Save block content manually ──
  const saveBlockContent = () => {
    if (block.blockType === 'text') {
      updateMutation.mutate({ content: content || null })
    } else if (block.blockType === 'image') {
      updateMutation.mutate({ imageCaption: caption || null })
    }
  }

  const blockDirty =
    (block.blockType === 'text' && content !== (block.content ?? '')) ||
    (block.blockType === 'image' && caption !== (block.imageCaption ?? ''))

  // ── Delete block ──
  const deleteMutation = useMutation({
    mutationFn: () => deleteBlock(postId, block.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  // ── Upload block image ──
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadBlockImage(postId, block.id, file),
    onSuccess: () => {
      toast.success('Image uploaded')
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] })
    },
    onError: (err) => toast.error(err.message),
  })

  const handleBlockImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImageMutation.mutate(file)
    if (blockImageRef.current) blockImageRef.current.value = ''
  }

  // ── Save embed ID ──
  const saveEmbedId = () => {
    if (!embedId) return
    if (block.blockType === 'game_embed') {
      updateMutation.mutate({ gameId: embedId })
    } else if (block.blockType === 'list_embed') {
      updateMutation.mutate({ listId: embedId })
    }
  }

  // ── Block type label ──
  const typeConfig = BLOCK_TYPES.find((bt) => bt.type === block.blockType)

  return (
    <div className="group relative bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)]">
      {/* Block header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b-2 border-border/30">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            {typeConfig?.icon}
            {typeConfig?.label}
          </span>
          {updateMutation.isPending && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {blockDirty && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={saveBlockContent}
              disabled={updateMutation.isPending}
              className="text-emerald-600 hover:text-emerald-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(index, 'down')}
            disabled={index === totalBlocks - 1}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Block body */}
      <div className="p-4">
        {block.blockType === 'text' && (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something..."
            rows={6}
            className="w-full bg-transparent border-0 focus-visible:ring-0 shadow-none resize-y text-foreground placeholder:text-muted-foreground/30 p-0 min-h-[120px]"
          />
        )}

        {block.blockType === 'image' && (
          <div className="space-y-3">
            {block.imageUrl ? (
              <div className="border-2 border-border/30 overflow-hidden">
                <img
                  src={`/api/blog-posts/${postId}/blocks/${block.id}/image`}
                  alt={caption || 'Block image'}
                  className="w-full max-h-96 object-contain bg-muted/30"
                />
              </div>
            ) : (
              <button
                onClick={() => blockImageRef.current?.click()}
                disabled={uploadImageMutation.isPending}
                className="w-full h-32 border-2 border-dashed border-border/40 hover:border-border bg-muted/20 hover:bg-muted/40 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {uploadImageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-xs font-semibold">Upload image</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={blockImageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleBlockImageChange}
            />
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Image caption (optional)"
              className="bg-transparent border-2 border-border/30 rounded-none text-sm"
            />
          </div>
        )}

        {block.blockType === 'game_embed' && (
          <div className="space-y-3">
            {block.game ? (
              <div className="flex items-center gap-3 p-3 bg-muted/30 border-2 border-border/30">
                {block.game.coverUrl ? (
                  <img
                    src={block.game.coverUrl}
                    alt={block.game.name}
                    className="w-12 h-12 object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center">
                    <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-sm">{block.game.name}</p>
                  {block.game.slug && (
                    <p className="text-xs text-muted-foreground">{block.game.slug}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={embedId}
                  onChange={(e) => setEmbedId(e.target.value)}
                  placeholder="Game ID (UUID)"
                  className="bg-transparent border-2 border-border/30 rounded-none text-sm font-mono flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveEmbedId}
                  disabled={!embedId || updateMutation.isPending}
                  className="border-4 border-border"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link'}
                </Button>
              </div>
            )}
          </div>
        )}

        {block.blockType === 'list_embed' && (
          <div className="space-y-3">
            {block.list ? (
              <div className="flex items-center gap-3 p-3 bg-muted/30 border-2 border-border/30">
                {block.list.coverUrl ? (
                  <img
                    src={block.list.coverUrl}
                    alt={block.list.name}
                    className="w-12 h-12 object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center">
                    <List className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-sm">{block.list.name}</p>
                  {block.list.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{block.list.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={embedId}
                  onChange={(e) => setEmbedId(e.target.value)}
                  placeholder="List ID (UUID)"
                  className="bg-transparent border-2 border-border/30 rounded-none text-sm font-mono flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveEmbedId}
                  disabled={!embedId || updateMutation.isPending}
                  className="border-4 border-border"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
