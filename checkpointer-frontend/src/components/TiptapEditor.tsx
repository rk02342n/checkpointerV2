import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  ImagePlus,
  Gamepad2,
  List,
  Undo2,
  Redo2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GameEmbed } from '@/components/extensions/GameEmbed'
import { ListEmbed } from '@/components/extensions/ListEmbed'
import { uploadPostImage, type Embeds } from '@/lib/blogPostsQuery'

// Shared extensions config
export function getTiptapExtensions(options?: { placeholder?: string }) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Image.configure({
      HTMLAttributes: { class: 'w-full max-h-96 object-contain my-3 border-2 border-border/30' },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? 'Start writing...',
    }),
    GameEmbed,
    ListEmbed,
  ]
}

// ── Toolbar (used in the editor page's top bar) ──

interface TiptapToolbarProps {
  editor: Editor
  postId: string
}

export function TiptapToolbar({ editor, postId }: TiptapToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showGameInput, setShowGameInput] = useState(false)
  const [showListInput, setShowListInput] = useState(false)
  const [embedInputValue, setEmbedInputValue] = useState('')

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const { imageUrl } = await uploadPostImage(postId, file)
      editor.chain().focus().setImage({ src: imageUrl }).run()
    } catch {
      // toast handled by caller
    } finally {
      setUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }, [editor, postId])

  const insertGameEmbed = useCallback(() => {
    if (!embedInputValue.trim()) return
    editor.chain().focus().insertContent({
      type: 'gameEmbed',
      attrs: { gameId: embedInputValue.trim() },
    }).run()
    setEmbedInputValue('')
    setShowGameInput(false)
  }, [editor, embedInputValue])

  const insertListEmbed = useCallback(() => {
    if (!embedInputValue.trim()) return
    editor.chain().focus().insertContent({
      type: 'listEmbed',
      attrs: { listId: embedInputValue.trim() },
    }).run()
    setEmbedInputValue('')
    setShowListInput(false)
  }, [editor, embedInputValue])

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <ToolbarButton
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          title="Insert image"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
        />

        <ToolbarButton
          onClick={() => { setShowGameInput(!showGameInput); setShowListInput(false); setEmbedInputValue('') }}
          active={showGameInput}
          title="Embed game"
        >
          <Gamepad2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => { setShowListInput(!showListInput); setShowGameInput(false); setEmbedInputValue('') }}
          active={showListInput}
          title="Embed list"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Embed input row */}
      {(showGameInput || showListInput) && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {showGameInput ? 'Game' : 'List'} ID:
          </span>
          <Input
            value={embedInputValue}
            onChange={(e) => setEmbedInputValue(e.target.value)}
            placeholder="Paste UUID..."
            className="flex-1 h-8 bg-transparent border-2 border-border/30 rounded-none text-sm font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                showGameInput ? insertGameEmbed() : insertListEmbed()
              }
              if (e.key === 'Escape') {
                setShowGameInput(false)
                setShowListInput(false)
                setEmbedInputValue('')
              }
            }}
            autoFocus
          />
          <Button
            variant="outline"
            size="sm"
            onClick={showGameInput ? insertGameEmbed : insertListEmbed}
            disabled={!embedInputValue.trim()}
            className="border-4 border-border h-8"
          >
            Insert
          </Button>
        </div>
      )}
    </>
  )
}

// ── Read-only viewer (used in BlogPostView and preview) ──

interface TiptapViewerProps {
  content: JSONContent | null
  embeds?: Embeds
}

export function TiptapViewer({ content, embeds }: TiptapViewerProps) {
  const editor = useEditor({
    extensions: getTiptapExtensions(),
    content: content || undefined,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (editor && embeds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = editor.storage as any
      storage.gameEmbed.games = embeds.games
      storage.listEmbed.lists = embeds.lists
    }
  }, [editor, embeds])

  if (!editor) return null

  return <EditorContent editor={editor} />
}

// ── Shared toolbar button ──

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-foreground/10 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}
