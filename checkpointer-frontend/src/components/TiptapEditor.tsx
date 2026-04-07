import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, useEditorState, EditorContent, type JSONContent, type Editor } from '@tiptap/react'
import { useQuery } from '@tanstack/react-query'
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
  ListPlus,
  Undo2,
  Redo2,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { GameEmbed } from '@/components/extensions/GameEmbed'
import { ListEmbed } from '@/components/extensions/ListEmbed'
import { uploadPostImage, type Embeds } from '@/lib/blogPostsQuery'
import { getSearchGamesQueryOptions, type Game } from '@/lib/gameQuery'
import { getSearchGameListsQueryOptions } from '@/lib/gameListsQuery'
import { useDebounce } from '@/lib/useDebounce'
import { SearchDropdown, type SearchDropdownItem } from './SearchDropdown'

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

  // Game embed search
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const debouncedGameSearch = useDebounce(gameSearchQuery, 300)
  const { data: gameSearchData, isLoading: gameSearchLoading, isError: gameSearchError } = useQuery({
    ...getSearchGamesQueryOptions(debouncedGameSearch),
    enabled: showGameInput && debouncedGameSearch.trim().length > 0,
  })
  const gameSearchItems: SearchDropdownItem[] = (gameSearchData?.games ?? []).map((game: Game) => ({
    id: game.id,
    name: game.name,
    imageUrl: game.coverUrl,
    secondary: game.releaseDate
      ? new Date(game.releaseDate).getFullYear().toString()
      : null,
  }))

  // List embed search
  const [listSearchQuery, setListSearchQuery] = useState('')
  const debouncedListSearch = useDebounce(listSearchQuery, 300)
  const { data: listSearchData, isLoading: listSearchLoading, isError: listSearchError } = useQuery({
    ...getSearchGameListsQueryOptions(debouncedListSearch),
    enabled: showListInput && debouncedListSearch.trim().length > 0,
  })
  const listSearchItems: SearchDropdownItem[] = (listSearchData?.lists ?? []).map((list) => ({
    id: list.id,
    name: list.name,
    imageUrl: list.coverUrl ?? null,
    secondary: list.description ?? null,
  }))

  // Only re-render when formatting state actually changes
  const activeState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

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

  const handleGameSelect = useCallback((item: SearchDropdownItem) => {
    const gameId = String(item.id)
    // Inject embed data into storage so the card renders immediately
    const game = (gameSearchData?.games ?? []).find((g: Game) => String(g.id) === gameId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = editor.storage as any
    storage.gameEmbed.games = {
      ...storage.gameEmbed.games,
      [gameId]: {
        id: gameId,
        name: item.name,
        slug: null,
        coverUrl: item.imageUrl,
        releaseDate: game?.releaseDate ?? null,
        igdbRating: null,
      },
    }
    editor.chain().focus().insertContent([
      { type: 'gameEmbed', attrs: { gameId } },
      { type: 'paragraph' },
    ]).run()
    setGameSearchQuery('')
    setShowGameInput(false)
  }, [editor, gameSearchData])

  const handleListSelect = useCallback((item: SearchDropdownItem) => {
    const listId = String(item.id)
    // Inject embed data into storage so the card renders immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = editor.storage as any
    storage.listEmbed.lists = {
      ...storage.listEmbed.lists,
      [listId]: {
        id: listId,
        name: item.name,
        description: item.secondary ?? null,
        coverUrl: item.imageUrl,
        gameCount: 0,
        ownerUsername: '',
        ownerDisplayName: null,
      },
    }
    editor.chain().focus().insertContent([
      { type: 'listEmbed', attrs: { listId } },
      { type: 'paragraph' },
    ]).run()
    setListSearchQuery('')
    setShowListInput(false)
  }, [editor])

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={activeState.bold}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={activeState.italic}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={activeState.h2}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={activeState.h3}
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

        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors text-xs ${
              showGameInput || showListInput
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            <span>Embed</span>
            <ChevronDown className="w-3 h-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded border border-border shadow-sm min-w-32 bg-background">
            <DropdownMenuItem
              onClick={() => { setShowGameInput(true); setShowListInput(false); setGameSearchQuery(''); setListSearchQuery('') }}
              className="focus:bg-foreground/10 focus:text-foreground"
            >
              <Gamepad2 className="w-4 h-4" />
              Game
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setShowListInput(true); setShowGameInput(false); setGameSearchQuery(''); setListSearchQuery('') }}
              className="focus:bg-foreground/10 focus:text-foreground"
            >
              <ListPlus className="w-4 h-4" />
              List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!activeState.canUndo}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!activeState.canRedo}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Embed search rows */}
      {showGameInput && (
        <div className="mt-2">
          <SearchDropdown
            query={gameSearchQuery}
            onQueryChange={setGameSearchQuery}
            items={gameSearchItems}
            isLoading={gameSearchLoading}
            isError={gameSearchError}
            onSelect={handleGameSelect}
            placeholder="Search games..."
            fallbackIcon={<Gamepad2 className="w-5 h-5 text-muted-foreground" />}
            emptyMessage="No games found."
            showDropdown={!!debouncedGameSearch}
            autoFocus
            onEscape={() => { setShowGameInput(false); setGameSearchQuery('') }}
            onClose={() => { setShowGameInput(false); setGameSearchQuery('') }}
          />
        </div>
      )}
      {showListInput && (
        <div className="mt-2">
          <SearchDropdown
            query={listSearchQuery}
            onQueryChange={setListSearchQuery}
            items={listSearchItems}
            isLoading={listSearchLoading}
            isError={listSearchError}
            onSelect={handleListSelect}
            placeholder="Search lists..."
            fallbackIcon={<ListPlus className="w-5 h-5 text-muted-foreground" />}
            emptyMessage="No lists found."
            showDropdown={!!debouncedListSearch}
            autoFocus
            onEscape={() => { setShowListInput(false); setListSearchQuery('') }}
            onClose={() => { setShowListInput(false); setListSearchQuery('') }}
          />
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
        class: 'prose prose-sm dark:prose-invert prose-headings:font-sans max-w-none focus:outline-none',
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
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors ${
        active
          ? 'bg-foreground/10 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}
