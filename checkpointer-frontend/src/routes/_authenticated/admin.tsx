import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbUserQueryOptions, updateAppSetting } from '@/lib/api'
import {
  adminStatsQueryOptions,
  adminUsersQueryOptions,
  adminReviewsQueryOptions,
  auditLogsQueryOptions,
  adminJobsQueryOptions,
  jobsOverviewQueryOptions,
  updateUserRole,
  toggleUserSuspension,
  deleteReviewAdmin,
  triggerJob,
  type AdminUser,
  type AdminReview,
  type AuditLog,
  type UserRole,
  type AdminJob,
  type JobStatus,
  type SyncState,
  type TriggerableJobType,
  type IgdbSyncMode,
} from '@/lib/adminApi'
import { searchGames, type Game } from '@/lib/gameQuery'
import {
  Users,
  MessageSquare,
  BarChart3,
  ScrollText,
  Shield,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Clock,
  Settings,
  Moon,
  Star,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Save,
  FileText,
  Activity,
  Play,
} from 'lucide-react'
import { useSettings } from '@/lib/settingsContext'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminDashboard,
})

type Tab = 'stats' | 'users' | 'reviews' | 'jobs' | 'audit' | 'settings'

function AdminDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('stats')
  const [usersOffset, setUsersOffset] = useState(0)
  const [reviewsOffset, setReviewsOffset] = useState(0)
  const [logsOffset, setLogsOffset] = useState(0)

  // Check if user is admin
  const { data: dbUserData, isPending: isUserPending } = useQuery(dbUserQueryOptions)
  const isAdmin = dbUserData?.account?.role === 'admin'

  // Redirect non-admins
  if (!isUserPending && !isAdmin) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Navbar />
        <div className="container mx-auto max-w-4xl mt-12">
          <div className="surface bg-rose-300 shadow-hard-6 p-8 text-center">
            <Shield className="w-16 h-16 text-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-black text-foreground mb-2">Access Denied</h1>
            <p className="text-foreground mb-4">You don't have permission to access the admin dashboard.</p>
            <Button
              onClick={() => navigate({ to: '/' })}
              className="bg-card hover:bg-muted text-foreground shadow-hard-4 transition-all font-bold"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'stats' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'reviews' as Tab, label: 'Reviews', icon: MessageSquare },
    { id: 'jobs' as Tab, label: 'Jobs', icon: Activity },
    { id: 'audit' as Tab, label: 'Audit Log', icon: ScrollText },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <Navbar />

      <div className="container mx-auto max-w-6xl mt-6">
        {/* Header */}
        <div className="surface bg-card shadow-hard-6 p-6 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-foreground" />
            <h1 className="text-3xl font-black text-foreground">Admin Dashboard</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all active:shadow-hard-2 active:translate-x-[2px] active:translate-y-[2px] ${
                activeTab === tab.id
                  ? 'bg-green-300 text-foreground shadow-hard-2 translate-x-[2px] translate-y-[2px]'
                  : 'bg-card text-foreground hover:bg-muted shadow-hard-4'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' && <StatsPanel />}
        {activeTab === 'users' && (
          <UsersPanel
            offset={usersOffset}
            onOffsetChange={setUsersOffset}
            queryClient={queryClient}
          />
        )}
        {activeTab === 'reviews' && (
          <ReviewsPanel
            offset={reviewsOffset}
            onOffsetChange={setReviewsOffset}
            queryClient={queryClient}
          />
        )}
        {activeTab === 'jobs' && <JobsPanel />}
        {activeTab === 'audit' && (
          <AuditPanel offset={logsOffset} onOffsetChange={setLogsOffset} />
        )}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}

function StatsPanel() {
  const { data: stats, isPending, isError } = useQuery(adminStatsQueryOptions)

  if (isPending) {
    return <LoadingCard />
  }

  if (isError || !stats) {
    return <ErrorCard message="Failed to load statistics" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Users Stats */}
      <div className="surface bg-sky-200 shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Users</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-foreground">Total</span>
            <span className="font-bold text-foreground">{stats.users.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground">Suspended</span>
            <span className="font-bold text-rose-700">{stats.users.suspended}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground">New (7 days)</span>
            <span className="font-bold text-green-700">{stats.users.newLast7Days}</span>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="surface bg-lime-200 shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserCog className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Roles</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.users.byRole).map(([role, count]) => (
            <div key={role} className="flex justify-between">
              <span className="text-foreground capitalize">{role}</span>
              <span className="font-bold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Stats */}
      <div className="surface bg-brand-200 shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Reviews</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-foreground">Total</span>
            <span className="font-bold text-foreground">{stats.reviews.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground">Avg Rating</span>
            <span className="font-bold text-foreground">
              {stats.reviews.averageRating ? `${stats.reviews.averageRating}/5` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Games Stats */}
      <div className="surface bg-rose-200 shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Games</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-foreground">Total in DB</span>
            <span className="font-bold text-foreground">{stats.games.total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsersPanel({
  offset,
  onOffsetChange,
  queryClient,
}: {
  offset: number
  onOffsetChange: (offset: number) => void
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const limit = 10
  const { data, isPending, isError } = useQuery(adminUsersQueryOptions(limit, offset))

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      toast.success('Role updated')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const suspendMutation = useMutation({
    mutationFn: toggleUserSuspension,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isPending) return <LoadingCard />
  if (isError || !data) return <ErrorCard message="Failed to load users" />

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="surface shadow-hard-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b-2 border-border">
            <tr>
              <th className="text-left p-4 font-bold text-foreground">User</th>
              <th className="text-left p-4 font-bold text-foreground">Role</th>
              <th className="text-left p-4 font-bold text-foreground">Status</th>
              <th className="text-left p-4 font-bold text-foreground">Joined</th>
              <th className="text-right p-4 font-bold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user: AdminUser) => (
              <tr key={user.id} className="border-b-2 border-border hover:bg-muted">
                <td className="p-4">
                  <Link
                    to="/users/$userId"
                    params={{ userId: user.id }}
                    className="block hover:bg-muted -m-2 p-2 rounded transition-colors"
                  >
                    <div className="font-bold text-foreground hover:text-sky-700 transition-colors">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                  </Link>
                </td>
                <td className="p-4">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      roleMutation.mutate({
                        userId: user.id,
                        role: e.target.value as UserRole,
                      })
                    }
                    disabled={roleMutation.isPending}
                    className="bg-card border-2 border-border px-2 py-1 text-sm font-bold"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  {user.suspendedAt ? (
                    <span className="inline-flex items-center gap-1 bg-rose-200 text-rose-800 px-2 py-1 border-2 border-border text-sm font-bold">
                      <Ban className="w-3 h-3" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-green-200 text-green-800 px-2 py-1 border-2 border-border text-sm font-bold">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => suspendMutation.mutate(user.id)}
                    disabled={suspendMutation.isPending || user.role === 'admin'}
                    className={
                      user.suspendedAt
                        ? 'text-green-700 hover:text-green-800 hover:bg-green-100'
                        : 'text-rose-700 hover:text-rose-800 hover:bg-rose-100'
                    }
                    title={user.role === 'admin' ? 'Cannot suspend admins' : ''}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        offset={offset}
        limit={limit}
        totalCount={data.totalCount}
        hasMore={data.hasMore}
        onOffsetChange={onOffsetChange}
      />
    </div>
  )
}

function ReviewsPanel({
  offset,
  onOffsetChange,
  queryClient,
}: {
  offset: number
  onOffsetChange: (offset: number) => void
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const limit = 10
  const { data, isPending, isError } = useQuery(adminReviewsQueryOptions(limit, offset))

  const deleteMutation = useMutation({
    mutationFn: deleteReviewAdmin,
    onSuccess: () => {
      toast.success('Review deleted')
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isPending) return <LoadingCard />
  if (isError || !data) return <ErrorCard message="Failed to load reviews" />

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="surface shadow-hard-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b-2 border-border">
            <tr>
              <th className="text-left p-4 font-bold text-foreground">Game</th>
              <th className="text-left p-4 font-bold text-foreground">User</th>
              <th className="text-left p-4 font-bold text-foreground">Rating</th>
              <th className="text-left p-4 font-bold text-foreground">Review</th>
              <th className="text-left p-4 font-bold text-foreground">Date</th>
              <th className="text-right p-4 font-bold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.reviews.map((review: AdminReview) => (
              <tr key={review.id} className="border-b-2 border-border hover:bg-muted">
                <td className="p-4 font-bold text-foreground max-w-[150px] truncate">
                  {review.gameName}
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">@{review.username}</div>
                </td>
                <td className="p-4">
                  <span className="bg-brand-200 text-brand-900 px-2 py-1 border-2 border-border text-sm font-bold">
                    {review.rating}/5
                  </span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <p className="text-sm text-muted-foreground truncate">
                    {review.reviewText || <span className="italic">No text</span>}
                  </p>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{formatDate(review.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(review.id)}
                    disabled={deleteMutation.isPending}
                    className="text-rose-700 hover:text-rose-800 hover:bg-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        offset={offset}
        limit={limit}
        totalCount={data.totalCount}
        hasMore={data.hasMore}
        onOffsetChange={onOffsetChange}
      />
    </div>
  )
}

function AuditPanel({
  offset,
  onOffsetChange,
}: {
  offset: number
  onOffsetChange: (offset: number) => void
}) {
  const limit = 15
  const { data, isPending, isError } = useQuery(auditLogsQueryOptions(limit, offset))

  if (isPending) return <LoadingCard />
  if (isError || !data) return <ErrorCard message="Failed to load audit logs" />

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DELETE_REVIEW':
      case 'DELETE_USER':
      case 'SUSPEND_USER':
        return 'bg-rose-200 text-rose-800'
      case 'UNSUSPEND_USER':
        return 'bg-green-200 text-green-800'
      case 'UPDATE_USER_ROLE':
        return 'bg-brand-200 text-brand-800'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ')
  }

  const getDetailValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return ''
  }

  return (
    <div className="surface shadow-hard-6 overflow-hidden">
      {data.logs.length === 0 ? (
        <div className="p-8 text-center">
          <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No audit logs yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y-2 divide-border">
            {data.logs.map((log: AuditLog) => (
              <div key={log.id} className="p-4 hover:bg-muted">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-1 border-2 border-border text-xs font-bold ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        by <span className="font-bold">@{log.adminUsername}</span>
                      </span>
                    </div>
                    {log.details && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {log.details.username !== undefined && log.details.username !== null && (
                          <span>User: @{getDetailValue(log.details.username)} </span>
                        )}
                        {log.details.previousRole !== undefined &&
                         log.details.previousRole !== null &&
                         log.details.newRole !== undefined &&
                         log.details.newRole !== null && (
                          <span>
                            ({getDetailValue(log.details.previousRole)} → {getDetailValue(log.details.newRole)})
                          </span>
                        )}
                        {log.details.gameName !== undefined && log.details.gameName !== null && (
                          <span>Game: {getDetailValue(log.details.gameName)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            offset={offset}
            limit={limit}
            totalCount={data.totalCount}
            hasMore={data.hasMore}
            onOffsetChange={onOffsetChange}
          />
        </>
      )}
    </div>
  )
}

const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  queued: 'bg-sky-200 text-sky-800',
  running: 'bg-amber-200 text-amber-800',
  succeeded: 'bg-green-200 text-green-800',
  failed: 'bg-rose-200 text-rose-800',
}

const SYNC_STATUS_META: Record<SyncState['status'], { label: string; style: string }> = {
  idle: { label: 'Last run OK', style: 'bg-green-200 text-green-800' },
  running: { label: 'Running', style: 'bg-amber-200 text-amber-800' },
  failed: { label: 'Failed', style: 'bg-rose-200 text-rose-800' },
}

const TRIGGER_PRESETS: {
  label: string
  description: string
  type: TriggerableJobType
  mode?: IgdbSyncMode
  confirm?: string
}[] = [
  {
    label: 'IGDB Sync',
    description: 'Incremental catalog + Steam map sync (same as the weekly run)',
    type: 'igdb-sync',
    mode: 'auto',
  },
  {
    label: 'Steam Map Only',
    description: 'Refresh only the Steam appid → game mapping',
    type: 'igdb-sync',
    mode: 'steam-map-only',
  },
  {
    label: 'Full Resync',
    description: 'Re-fetch the entire IGDB catalog (takes hours)',
    type: 'igdb-sync',
    mode: 'full',
    confirm: 'A full resync re-fetches the entire IGDB catalog and takes several hours. Run it?',
  },
  {
    label: 'Prune Jobs',
    description: 'Delete settled jobs past retention (7d succeeded / 30d failed)',
    type: 'prune-jobs',
  },
]

function jobTimestamp(dateStr: string): { relative: string; full: string } {
  const date = new Date(dateStr)
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  let span: string
  if (abs < 60) span = `${abs}s`
  else if (abs < 3600) span = `${Math.round(abs / 60)}m`
  else if (abs < 86400) span = `${Math.round(abs / 3600)}h`
  else span = `${Math.round(abs / 86400)}d`
  return {
    relative: diffSec >= 0 ? `${span} ago` : `in ${span}`,
    full: date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

function describeJobPayload(job: AdminJob): string | null {
  const parts: string[] = []
  if (typeof job.payload.mode === 'string') parts.push(`mode: ${job.payload.mode}`)
  if (typeof job.payload.userId === 'string') parts.push(`user: ${job.payload.userId.slice(0, 8)}…`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function SyncStateCard({ title, state }: { title: string; state: SyncState | null }) {
  if (!state) {
    return (
      <div className="surface bg-muted shadow-hard-4 p-4">
        <h4 className="font-bold text-foreground mb-2">{title}</h4>
        <p className="text-sm text-muted-foreground italic">Never run</p>
      </div>
    )
  }

  const meta = SYNC_STATUS_META[state.status]
  const lastRun = state.lastRunAt ? jobTimestamp(state.lastRunAt) : null
  const dataThrough =
    state.lastSyncTimestamp > 0 ? jobTimestamp(new Date(state.lastSyncTimestamp * 1000).toISOString()) : null

  return (
    <div className="surface bg-card shadow-hard-4 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="font-bold text-foreground">{title}</h4>
        <span className={`px-2 py-1 border-2 border-border text-xs font-bold ${meta.style}`}>
          {meta.label}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Last run</span>
          <span className="font-bold text-foreground" title={lastRun?.full}>
            {lastRun ? lastRun.relative : 'unknown'}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Data current through</span>
          <span className="font-bold text-foreground" title={dataThrough?.full}>
            {dataThrough ? dataThrough.full : 'n/a'}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Rows processed last run</span>
          <span className="font-bold text-foreground">{state.totalGamesProcessed.toLocaleString()}</span>
        </div>
        {state.lastCompletedOffset > 0 && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Resume checkpoint</span>
            <span className="font-bold text-amber-700">offset {state.lastCompletedOffset.toLocaleString()}</span>
          </div>
        )}
        {state.error && (
          <p className="text-xs text-rose-700 font-mono mt-2 break-all">{state.error}</p>
        )}
      </div>
    </div>
  )
}

function JobsPanel() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')

  const { data: overview, isPending: isOverviewPending, isError: isOverviewError } =
    useQuery(jobsOverviewQueryOptions)
  const { data: jobsData, isPending: isJobsPending, isError: isJobsError } = useQuery(
    adminJobsQueryOptions(statusFilter === 'all' ? undefined : statusFilter),
  )

  const triggerMutation = useMutation({
    mutationFn: ({ type, mode }: { type: TriggerableJobType; mode?: IgdbSyncMode }) =>
      triggerJob(type, mode),
    onSuccess: () => {
      toast.success('Job queued — worker kicked')
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs-overview'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isOverviewPending || isJobsPending) return <LoadingCard />
  if (isOverviewError || isJobsError || !overview || !jobsData) {
    return <ErrorCard message="Failed to load job queue" />
  }

  const statusOrder: JobStatus[] = ['queued', 'running', 'succeeded', 'failed']
  const worker = overview.worker

  return (
    <div className="space-y-6">
      {/* Worker liveness + queue counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`surface shadow-hard-4 p-4 ${worker.reachable ? 'bg-green-200' : 'bg-rose-200'}`}>
          <div className="text-sm font-bold text-foreground mb-1">Worker</div>
          <div className={`text-lg font-black ${worker.reachable ? 'text-green-800' : 'text-rose-800'}`}>
            {worker.reachable ? 'Online' : 'Unreachable'}
          </div>
          {worker.reachable && (
            <div className="text-xs text-foreground mt-1">
              {worker.interactiveRunning ?? 0} interactive · {worker.batchRunning ?? 0} batch
            </div>
          )}
        </div>
        {statusOrder.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={`surface bg-card shadow-hard-4 p-4 text-left transition-all hover:bg-muted ${
              statusFilter === status ? 'translate-x-[2px] translate-y-[2px] shadow-hard-2 bg-muted' : ''
            }`}
            title={`Filter table by ${status}`}
          >
            <div className="text-sm font-bold text-foreground mb-1 capitalize">{status}</div>
            <div className="text-lg font-black text-foreground">{overview.counts[status] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* Sync checkpoint states */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SyncStateCard title="IGDB Catalog Sync" state={overview.syncStates.igdb} />
        <SyncStateCard title="Steam App Map Sync" state={overview.syncStates.steamAppMap} />
      </div>

      {/* Manual triggers */}
      <div className="surface shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Run a Job Now</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Enqueues the job and kicks the worker immediately. Duplicate triggers while a manual job
          of the same type is queued or running are ignored.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TRIGGER_PRESETS.map((preset) => (
            <div key={preset.label} className="flex items-center justify-between gap-3 p-3 surface bg-muted">
              <div className="min-w-0">
                <div className="font-bold text-foreground text-sm">{preset.label}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (preset.confirm && !window.confirm(preset.confirm)) return
                  triggerMutation.mutate({ type: preset.type, mode: preset.mode })
                }}
                disabled={triggerMutation.isPending}
                className="bg-green-400 hover:bg-green-500 text-foreground shadow-hard-3 transition-all font-bold shrink-0"
              >
                <Play className="w-4 h-4 mr-1" />
                Run
              </Button>
            </div>
          ))}
        </div>
        {!worker.reachable && (
          <p className="text-xs text-amber-700 font-bold mt-3">
            The worker is currently unreachable — triggered jobs stay queued until a worker picks
            them up (start one locally with <code className="font-mono">bun run dev:worker</code>).
          </p>
        )}
      </div>

      {/* Jobs table */}
      <div className="surface shadow-hard-6 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b-2 border-border bg-muted">
          <h3 className="font-bold text-foreground">
            Recent Jobs{statusFilter !== 'all' && <span className="capitalize"> — {statusFilter}</span>}
          </h3>
          <span className="text-xs text-muted-foreground">auto-refreshes every 10s</span>
        </div>
        {jobsData.jobs.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === 'all' ? 'No jobs yet' : `No ${statusFilter} jobs`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b-2 border-border">
                <tr>
                  <th className="text-left p-4 font-bold text-foreground">Job</th>
                  <th className="text-left p-4 font-bold text-foreground">Status</th>
                  <th className="text-left p-4 font-bold text-foreground">Attempts</th>
                  <th className="text-left p-4 font-bold text-foreground">Enqueued</th>
                  <th className="text-left p-4 font-bold text-foreground">Last Update</th>
                  <th className="text-left p-4 font-bold text-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {jobsData.jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function JobProgressBar({ progress, settled }: { progress: NonNullable<AdminJob['progress']>; settled: boolean }) {
  const pct =
    progress.total && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null

  return (
    <div className="min-w-[160px]">
      <div className="text-xs text-muted-foreground mb-1">
        {progress.phase} — {progress.done.toLocaleString()}
        {progress.total !== null && ` / ${progress.total.toLocaleString()}`}
        {pct !== null && ` (${pct}%)`}
      </div>
      {pct !== null && !settled && (
        <div className="h-3 border-2 border-border bg-muted">
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

function JobRow({ job }: { job: AdminJob }) {
  const created = jobTimestamp(job.createdAt)
  const updated = jobTimestamp(job.updatedAt)
  const payloadHint = describeJobPayload(job)

  // What the worker is doing (or will do) next, derived from the row's state.
  let statusDetail: { text: string; alert?: boolean } | null = null
  if (job.status === 'running' && job.leaseExpiresAt) {
    const leaseMs = new Date(job.leaseExpiresAt).getTime() - Date.now()
    statusDetail =
      leaseMs > 0
        ? { text: `lease healthy (${Math.round(leaseMs / 1000)}s left)` }
        : { text: 'lease expired — will be reclaimed', alert: true }
  } else if (job.status === 'queued' && new Date(job.runAt).getTime() > Date.now()) {
    statusDetail = { text: `retry ${jobTimestamp(job.runAt).relative}` }
  }

  return (
    <tr className="border-b-2 border-border hover:bg-muted align-top">
      <td className="p-4">
        <div className="font-bold text-foreground">{job.type}</div>
        {payloadHint && <div className="text-xs text-muted-foreground">{payloadHint}</div>}
        {job.dedupeKey && (
          <div className="text-xs text-muted-foreground font-mono truncate max-w-[220px]" title={job.dedupeKey}>
            {job.dedupeKey}
          </div>
        )}
      </td>
      <td className="p-4">
        <span className={`px-2 py-1 border-2 border-border text-xs font-bold ${JOB_STATUS_STYLES[job.status]}`}>
          {job.status}
        </span>
        {statusDetail && (
          <div className={`text-xs mt-1 ${statusDetail.alert ? 'text-rose-700 font-bold' : 'text-muted-foreground'}`}>
            {statusDetail.text}
          </div>
        )}
      </td>
      <td className="p-4 text-sm font-bold text-foreground">
        {job.attempts}/{job.maxAttempts}
      </td>
      <td className="p-4 text-sm text-muted-foreground" title={created.full}>
        {created.relative}
      </td>
      <td className="p-4 text-sm text-muted-foreground" title={updated.full}>
        {updated.relative}
      </td>
      <td className="p-4 max-w-[280px]">
        {job.progress && (
          <div className={job.lastError ? 'mb-2' : ''}>
            <JobProgressBar progress={job.progress} settled={job.status !== 'running'} />
          </div>
        )}
        {job.lastError && (
          <details>
            <summary className="text-xs text-rose-700 font-bold cursor-pointer truncate">
              {job.lastError.split('\n')[0]}
            </summary>
            <pre className="text-xs text-rose-700 font-mono whitespace-pre-wrap break-all mt-2 max-h-48 overflow-y-auto">
              {job.lastError}
            </pre>
          </details>
        )}
        {!job.progress && !job.lastError && <span className="text-xs text-muted-foreground">—</span>}
      </td>
    </tr>
  )
}

function Pagination({
  offset,
  limit,
  totalCount,
  hasMore,
  onOffsetChange,
}: {
  offset: number
  limit: number
  totalCount: number
  hasMore: boolean
  onOffsetChange: (offset: number) => void
}) {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="flex items-center justify-between p-4 border-t-4 border-border bg-muted">
      <div className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount}
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="shadow-hard-3 transition-all disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold text-foreground">
          {currentPage} / {totalPages || 1}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={!hasMore}
          className="shadow-hard-3 transition-all disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function SettingsPanel() {
  const { settings, isLoading, updateSettings } = useSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingBlog, setIsSavingBlog] = useState(false)

  const handleToggle = async () => {
    setIsSaving(true)
    try {
      await updateSettings({ darkModeEnabled: !settings.darkModeEnabled })
      toast.success('Setting updated')
    } catch {
      toast.error('Failed to update setting')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBlogToggle = async () => {
    setIsSavingBlog(true)
    try {
      await updateSettings({ blogPostsEnabled: !settings.blogPostsEnabled })
      toast.success('Setting updated')
    } catch {
      toast.error('Failed to update setting')
    } finally {
      setIsSavingBlog(false)
    }
  }

  if (isLoading) {
    return <LoadingCard />
  }

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <div className="surface shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Moon className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Appearance</h3>
        </div>

        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 surface bg-muted">
            <div>
              <h4 className="font-bold text-foreground">Dark Mode Toggle</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Allow users to switch between light and dark themes
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isSaving}
              className={`relative w-14 h-8 border-2 border-border transition-colors ${
                settings.darkModeEnabled ? 'bg-green-400' : 'bg-muted'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={settings.darkModeEnabled ? 'Disable dark mode' : 'Enable dark mode'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card border-2 border-border transition-transform ${
                  settings.darkModeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Status indicator */}
          <div className="text-sm text-muted-foreground">
            Status:{' '}
            <span className={`font-bold ${settings.darkModeEnabled ? 'text-green-700' : 'text-muted-foreground'}`}>
              {settings.darkModeEnabled ? 'Enabled' : 'Disabled'}
            </span>
            {' '}- Users {settings.darkModeEnabled ? 'can' : 'cannot'} see the theme toggle button
          </div>
        </div>
      </div>

      {/* Features Settings */}
      <div className="surface shadow-hard-6 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">Features</h3>
        </div>

        <div className="space-y-4">
          {/* Blog Posts Toggle */}
          <div className="flex items-center justify-between p-4 surface bg-muted">
            <div>
              <h4 className="font-bold text-foreground">Blog Posts</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Show the Posts tab on user profiles. When disabled, only admins can see blog posts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBlogToggle}
              disabled={isSavingBlog}
              className={`relative w-14 h-8 border-2 border-border transition-colors ${
                settings.blogPostsEnabled ? 'bg-green-400' : 'bg-muted'
              } ${isSavingBlog ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={settings.blogPostsEnabled ? 'Disable blog posts' : 'Enable blog posts'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card border-2 border-border transition-transform ${
                  settings.blogPostsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Status indicator */}
          <div className="text-sm text-muted-foreground">
            Status:{' '}
            <span className={`font-bold ${settings.blogPostsEnabled ? 'text-green-700' : 'text-muted-foreground'}`}>
              {settings.blogPostsEnabled ? 'Enabled' : 'Admin only'}
            </span>
            {' '}- {settings.blogPostsEnabled ? 'All users can see blog posts on profiles' : 'Only admins can see the Posts tab'}
          </div>
        </div>
      </div>

      {/* Featured Games */}
      <FeaturedGamesPicker />

      {/* Info Card */}
      <div className="surface bg-sky-100 shadow-hard-6 p-6">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-foreground mt-0.5" />
          <div>
            <h4 className="font-bold text-foreground">About Settings</h4>
            <p className="text-sm text-foreground mt-1">
              Settings apply globally to all users. Changes are saved to the server and take effect immediately for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturedGamesPicker() {
  const { settings } = useSettings()
  const queryClient = useQueryClient()
  const [selectedGames, setSelectedGames] = useState<Game[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load existing featured games on mount
  useEffect(() => {
    const ids = settings.featuredGameIds
    if (!ids || ids.length === 0 || isLoaded) {
      setIsLoaded(true)
      return
    }

    // Fetch game details for the saved IDs
    async function loadGames() {
      try {
        const res = await fetch('/api/games/featured')
        if (res.ok) {
          const data = await res.json()
          // Only use games that match the saved IDs, preserving order
          const savedIds = settings.featuredGameIds ?? []
          const gameMap = new Map(data.games.map((g: Game) => [String(g.id), g]))
          const ordered = savedIds.map(id => gameMap.get(id)).filter(Boolean) as Game[]
          setSelectedGames(ordered)
        }
      } catch {
        // Ignore errors, start with empty list
      } finally {
        setIsLoaded(true)
      }
    }
    loadGames()
  }, [settings.featuredGameIds, isLoaded])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await searchGames(searchQuery)
        // Filter out already-selected games
        const selectedIds = new Set(selectedGames.map(g => String(g.id)))
        setSearchResults(data.games.filter(g => !selectedIds.has(String(g.id))))
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery, selectedGames])

  const addGame = (game: Game) => {
    setSelectedGames(prev => [...prev, game])
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const removeGame = (gameId: string | number) => {
    setSelectedGames(prev => prev.filter(g => String(g.id) !== String(gameId)))
  }

  const moveGame = (index: number, direction: 'up' | 'down') => {
    const newList = [...selectedGames]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newList.length) return
    ;[newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]]
    setSelectedGames(newList)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const ids = selectedGames.map(g => String(g.id))
      await updateAppSetting('featuredGameIds', ids)
      queryClient.invalidateQueries({ queryKey: ['featured-games'] })
      toast.success('Featured games updated')
    } catch {
      toast.error('Failed to save featured games')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="surface shadow-hard-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-6 h-6 text-foreground" />
        <h3 className="text-lg font-bold text-foreground">Featured Games</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Select and order the games that appear in the "Featured games" section on the homepage.
        If no games are selected, the top-rated games by IGDB rating will be shown instead.
      </p>

      {/* Search Input */}
      <div className="relative mb-4" ref={dropdownRef}>
        <div className="flex items-center gap-2 border-2 border-border bg-muted px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games to add..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {isSearching && (
            <div className="animate-spin h-4 w-4 border-2 border-border border-t-transparent rounded-full" />
          )}
        </div>

        {/* Search Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 surface shadow-hard-4 max-h-60 overflow-y-auto">
            {searchResults.map((game) => (
              <button
                key={game.id}
                onClick={() => addGame(game)}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted text-left border-b border-border last:border-b-0"
              >
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-8 h-10 object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-8 h-10 bg-muted border-2 border-border" />
                )}
                <span className="text-sm font-bold text-foreground truncate">{game.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Games List */}
      {selectedGames.length > 0 && (
        <div className="space-y-2 mb-4">
          {selectedGames.map((game, index) => (
            <div
              key={game.id}
              className="flex items-center gap-3 p-2 surface bg-muted"
            >
              <span className="text-xs font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
              {game.coverUrl ? (
                <img
                  src={game.coverUrl}
                  alt={game.name}
                  className="w-8 h-10 object-cover border-2 border-border"
                />
              ) : (
                <div className="w-8 h-10 bg-muted border-2 border-border" />
              )}
              <span className="flex-1 text-sm font-bold text-foreground truncate">{game.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveGame(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-muted disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={() => moveGame(index, 'down')}
                  disabled={index === selectedGames.length - 1}
                  className="p-1 hover:bg-muted disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={() => removeGame(game.id)}
                  className="p-1 hover:bg-rose-100 transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4 text-rose-700" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedGames.length === 0 && isLoaded && (
        <div className="text-sm text-muted-foreground italic mb-4 p-4 surface bg-muted text-center">
          No featured games selected. The homepage will show top-rated games by IGDB rating.
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-green-400 hover:bg-green-500 text-foreground shadow-hard-4 transition-all font-bold"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? 'Saving...' : 'Save Featured Games'}
      </Button>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="surface shadow-hard-6 p-8">
      <div className="flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-border border-t-transparent"></div>
        <span className="ml-3 text-foreground font-bold">Loading...</span>
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="surface bg-rose-200 shadow-hard-6 p-8 text-center">
      <p className="text-rose-800 font-bold">{message}</p>
    </div>
  )
}
