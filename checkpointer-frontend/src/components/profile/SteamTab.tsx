import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import {
  Gamepad2,
  RefreshCw,
  Unlink,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Clock,
  CalendarHeart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadMoreButton } from '@/components/LoadMoreButton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  steamStatusQueryOptions,
  steamSummaryQueryOptions,
  steamLibraryInfiniteOptions,
  steamUnmatchedQueryOptions,
  steamWishlistPendingQueryOptions,
  importSteamWishlist,
  syncSteam,
  disconnectSteam,
  formatPlaytime,
  type SteamLibraryItem,
} from '@/lib/steamQuery'

interface SteamTabProps {
  userId: string
  isOwnProfile: boolean
  themed: boolean
}

export function SteamTab({ userId, isOwnProfile, themed }: SteamTabProps) {
  return isOwnProfile
    ? <OwnSteamTab userId={userId} themed={themed} />
    : <PublicSteamTab userId={userId} themed={themed} />
}

// --- Own profile: connect CTA, sync controls, disconnect ---

function OwnSteamTab({ userId, themed }: { userId: string; themed: boolean }) {
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const { isPending, isError, data: status } = useQuery(steamStatusQueryOptions)

  const invalidateSteam = () => {
    queryClient.invalidateQueries({ queryKey: ['steam-status'] })
    queryClient.invalidateQueries({ queryKey: ['steam-summary', userId] })
    queryClient.invalidateQueries({ queryKey: ['steam-library', userId] })
    queryClient.invalidateQueries({ queryKey: ['steam-unmatched', userId] })
    queryClient.invalidateQueries({ queryKey: ['steam-wishlist-pending'] })
    queryClient.invalidateQueries({ queryKey: ['steam-playtime'] })
    queryClient.invalidateQueries({ queryKey: ['user-insights'] })
  }

  const syncMutation = useMutation({
    mutationFn: syncSteam,
    onSuccess: (result) => {
      posthog.capture('steam_synced', { total_games: result.totalGames })
      if (result.status === 'private_profile') {
        toast.warning('Steam says your game details are private — update your Steam privacy settings and sync again.')
      } else {
        toast.success(`Synced ${result.totalGames} games from Steam`)
      }
      invalidateSteam()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sync with Steam')
      invalidateSteam()
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnectSteam,
    onSuccess: () => {
      posthog.capture('steam_disconnected')
      toast.success('Steam account disconnected')
      setShowDisconnectDialog(false)
      invalidateSteam()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect Steam')
    },
  })

  if (isPending) return <SteamSkeleton />
  if (isError || !status) {
    return <p className="text-muted-foreground text-sm text-center py-12">Failed to load Steam status</p>
  }

  if (!status.connected) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-foreground font-bold mb-2">Connect your Steam account</p>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Import your Steam library and playtime onto your profile. Your play history and reviews stay untouched — Steam data lives alongside them.
        </p>
        <Button asChild>
          <a href="/api/steam/connect">
            <Gamepad2 className="w-4 h-4" />
            Connect with Steam
          </a>
        </Button>
      </div>
    )
  }

  const inCooldown = !!status.nextSyncAvailableAt && new Date(status.nextSyncAvailableAt) > new Date()

  return (
    <div className="space-y-6">
      {/* Connection header */}
      <div className="surface profile-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {status.avatarUrl && (
            <img
              src={status.avatarUrl}
              alt={status.personaName ?? 'Steam avatar'}
              className="w-12 h-12 object-cover border-2 border-border"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground truncate">{status.personaName ?? 'Steam account'}</span>
              {status.profileUrl && (
                <a
                  href={status.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Open Steam profile"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status.totalGames} games · {formatPlaytime(status.totalPlaytimeMin)} played
              {status.lastSyncedAt && ` · synced ${new Date(status.lastSyncedAt).toLocaleString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || inCooldown}
              title={inCooldown ? 'Synced recently — try again in a few minutes' : 'Pull latest data from Steam'}
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : inCooldown ? (
                <Clock className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDisconnectDialog(true)}
              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <Unlink className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      {/* Sync problems */}
      {status.syncStatus === 'private_profile' && (
        <div className="surface bg-amber-100 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Steam says your game details are private, so your library can't be imported.{' '}
            <a
              href="https://steamcommunity.com/my/edit/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              Update your Steam privacy settings
            </a>{' '}
            (set "Game details" to Public), then sync again.
          </p>
        </div>
      )}
      {status.syncStatus === 'error' && (
        <div className="surface bg-rose-100 dark:bg-rose-900/40 text-rose-950 dark:text-rose-100 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">The last sync failed. Try syncing again in a few minutes.</p>
        </div>
      )}

      <SteamWishlistImport />

      <SteamLibrarySection userId={userId} themed={themed} />

      {/* Disconnect confirmation */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="surface bg-background shadow-hard-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Unlink className="w-5 h-5" />
              Disconnect Steam
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This removes your imported Steam library and playtime from Checkpointer. Games you added to Want to Play stay. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={disconnectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Steam wishlist → Want to Play (confirm-to-import; own profile only) ---
//
// Everything starts selected; unticking opts a game out. Import is the only
// path from the Steam layer into want_to_play, so a game removed from Want to
// Play later is never re-added by a sync.

function SteamWishlistImport() {
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const [deselected, setDeselected] = useState<Set<number>>(new Set())
  const { data } = useQuery(steamWishlistPendingQueryOptions)
  const items = data?.items ?? []

  const importMutation = useMutation({
    mutationFn: importSteamWishlist,
    onSuccess: (result) => {
      posthog.capture('steam_wishlist_imported', { count: result.imported })
      toast.success(
        result.imported === 1
          ? 'Added 1 game to Want to Play'
          : `Added ${result.imported} games to Want to Play`,
      )
      setDeselected(new Set())
      queryClient.invalidateQueries({ queryKey: ['want-to-play'] })
      queryClient.invalidateQueries({ queryKey: ['steam-wishlist-pending'] })
      queryClient.invalidateQueries({ queryKey: ['steam-status'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to import wishlist')
    },
  })

  if (items.length === 0) return null

  const selectedIds = items
    .filter((item) => !deselected.has(item.steamAppId))
    .map((item) => item.steamAppId)
  const allSelected = selectedIds.length === items.length

  const toggle = (steamAppId: number) => {
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(steamAppId)) next.delete(steamAppId)
      else next.add(steamAppId)
      return next
    })
  }

  return (
    <div className="surface profile-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold text-foreground">Steam wishlist</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} {items.length === 1 ? 'game' : 'games'} from your Steam wishlist
            {items.length === 1 ? " isn't" : " aren't"} in your Want to Play yet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setDeselected(allSelected ? new Set(items.map((i) => i.steamAppId)) : new Set())
            }
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
          <Button
            size="sm"
            onClick={() => importMutation.mutate(selectedIds)}
            disabled={importMutation.isPending || selectedIds.length === 0}
          >
            {importMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarHeart className="w-4 h-4" />
            )}
            Import {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 -mx-1 px-1">
        {items.map((item) => (
          <label
            key={item.steamAppId}
            className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer"
          >
            <Checkbox
              checked={!deselected.has(item.steamAppId)}
              onCheckedChange={() => toggle(item.steamAppId)}
            />
            {item.gameCoverUrl ? (
              <img
                src={item.gameCoverUrl}
                alt={item.gameName}
                loading="lazy"
                className="w-8 h-10 object-cover border-2 border-border shrink-0"
              />
            ) : (
              <div className="w-8 h-10 bg-muted border-2 border-border flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-foreground truncate flex-1">
              {item.gameName}
            </span>
            {item.addedAt && (
              <span className="text-xs text-muted-foreground shrink-0">
                Added {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

// --- Public profile: read-only summary + library ---

function PublicSteamTab({ userId, themed }: { userId: string; themed: boolean }) {
  const { isPending, isError, data: summary } = useQuery(steamSummaryQueryOptions(userId))

  if (isPending) return <SteamSkeleton />
  if (isError || !summary || !summary.connected) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-foreground font-bold">No Steam account connected</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface profile-card p-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground truncate">{summary.personaName ?? 'Steam library'}</span>
          {summary.profileUrl && (
            <a
              href={summary.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="Open Steam profile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {summary.totalGames} games · {formatPlaytime(summary.totalPlaytimeMin)} played
        </p>
      </div>

      <SteamLibrarySection userId={userId} themed={themed} />
    </div>
  )
}

// --- Shared library grid + unmatched note ---

function SteamLibrarySection({ userId, themed }: { userId: string; themed: boolean }) {
  const [showUnmatched, setShowUnmatched] = useState(false)
  const {
    data: libraryData,
    isPending: libraryPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery(steamLibraryInfiniteOptions(userId))

  const { data: unmatchedData } = useQuery(steamUnmatchedQueryOptions(userId))

  const library = libraryData?.pages.flatMap((p) => p.library) ?? []
  const unmatched = unmatchedData?.items ?? []

  if (libraryPending) return <SteamSkeleton />

  if (library.length === 0) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-foreground font-bold mb-2">No games imported yet</p>
        <p className="text-muted-foreground text-sm">Sync to pull the Steam library in.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {library.map((item: SteamLibraryItem) => (
          <Link
            key={item.steamAppId}
            to="/games/$gameId"
            params={{ gameId: item.gameId }}
            className="group block"
            title={`${item.gameName} — ${formatPlaytime(item.playtimeForeverMin)}`}
          >
            <div className={`relative border-2 border-border ${themed ? '' : 'bg-muted'} shadow-hard-3 group-hover:shadow-hard-4 group-active:shadow-hard-2 group-active:translate-x-[2px] group-active:translate-y-[2px] transition-all`}>
              {item.gameCoverUrl ? (
                <img
                  src={item.gameCoverUrl}
                  alt={item.gameName}
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover"
                />
              ) : (
                <div className="w-full aspect-[3/4] flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 bg-stone-900/85 text-white text-[11px] font-bold px-1.5 py-0.5">
                {formatPlaytime(item.playtimeForeverMin)}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground truncate mt-1.5">{item.gameName}</p>
          </Link>
        ))}
      </div>
      <LoadMoreButton
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

      {unmatched.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowUnmatched((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showUnmatched ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {unmatched.length} Steam {unmatched.length === 1 ? 'entry' : 'entries'} couldn't be matched to the catalog
          </button>
          {showUnmatched && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-5">
              {unmatched.map((item) => (
                <li key={item.steamAppId} className="flex justify-between gap-4">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0">{formatPlaytime(item.playtimeForeverMin)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SteamSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="w-full aspect-[3/4] bg-muted-foreground/20 border-2 border-border" />
          <div className="h-3 w-3/4 bg-muted-foreground/20 mt-1.5" />
        </div>
      ))}
    </div>
  )
}
