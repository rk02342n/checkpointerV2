import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbUserQueryOptions, updateAppSetting } from '@/lib/api'
import {
  adminStatsQueryOptions,
  adminUsersQueryOptions,
  adminReviewsQueryOptions,
  auditLogsQueryOptions,
  updateUserRole,
  toggleUserSuspension,
  deleteReviewAdmin,
  type AdminUser,
  type AdminReview,
  type AuditLog,
  type UserRole,
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
} from 'lucide-react'
import { useSettings } from '@/lib/settingsContext'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminDashboard,
})

type Tab = 'stats' | 'users' | 'reviews' | 'audit' | 'settings'

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
      <div className="min-h-screen bg-rose-50 p-6">
        <Navbar />
        <div className="container mx-auto max-w-4xl mt-12">
          <div className="bg-rose-300 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 text-center">
            <Shield className="w-16 h-16 text-stone-900 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-stone-900 mb-2">Access Denied</h1>
            <p className="text-stone-900 mb-4">You don't have permission to access the admin dashboard.</p>
            <Button
              onClick={() => navigate({ to: '/' })}
              className="bg-white hover:bg-stone-50 text-stone-900 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold"
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
    { id: 'audit' as Tab, label: 'Audit Log', icon: ScrollText },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-rose-50 p-6">
      <Navbar />

      <div className="container mx-auto max-w-6xl mt-6">
        {/* Header */}
        <div className="bg-amber-200/10 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-stone-900" />
            <h1 className="text-3xl font-black text-stone-900">Admin Dashboard</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-4 border-stone-900 font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-green-300 text-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]'
                  : 'bg-white text-stone-900 hover:bg-stone-50 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px]'
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
      <div className="bg-sky-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-stone-900" />
          <h3 className="text-lg font-bold text-stone-900">Users</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-stone-900">Total</span>
            <span className="font-bold text-stone-900">{stats.users.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-900">Suspended</span>
            <span className="font-bold text-rose-700">{stats.users.suspended}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-900">New (7 days)</span>
            <span className="font-bold text-green-700">{stats.users.newLast7Days}</span>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="bg-lime-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserCog className="w-6 h-6 text-stone-900" />
          <h3 className="text-lg font-bold text-stone-900">Roles</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.users.byRole).map(([role, count]) => (
            <div key={role} className="flex justify-between">
              <span className="text-stone-900 capitalize">{role}</span>
              <span className="font-bold text-stone-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Stats */}
      <div className="bg-amber-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-stone-900" />
          <h3 className="text-lg font-bold text-stone-900">Reviews</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-stone-900">Total</span>
            <span className="font-bold text-stone-900">{stats.reviews.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-900">Avg Rating</span>
            <span className="font-bold text-stone-900">
              {stats.reviews.averageRating ? `${stats.reviews.averageRating}/5` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Games Stats */}
      <div className="bg-rose-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-stone-900" />
          <h3 className="text-lg font-bold text-stone-900">Games</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-stone-900">Total in DB</span>
            <span className="font-bold text-stone-900">{stats.games.total}</span>
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
    <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-100 border-b-4 border-stone-900">
            <tr>
              <th className="text-left p-4 font-bold text-stone-900">User</th>
              <th className="text-left p-4 font-bold text-stone-900">Role</th>
              <th className="text-left p-4 font-bold text-stone-900">Status</th>
              <th className="text-left p-4 font-bold text-stone-900">Joined</th>
              <th className="text-right p-4 font-bold text-stone-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user: AdminUser) => (
              <tr key={user.id} className="border-b-2 border-stone-200 hover:bg-stone-50">
                <td className="p-4">
                  <Link
                    to="/users/$userId"
                    params={{ userId: user.id }}
                    className="block hover:bg-stone-100 -m-2 p-2 rounded transition-colors"
                  >
                    <div className="font-bold text-stone-900 hover:text-sky-700 transition-colors">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-sm text-stone-500">@{user.username}</div>
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
                    className="bg-white border-4 border-stone-900 px-2 py-1 text-sm font-bold"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  {user.suspendedAt ? (
                    <span className="inline-flex items-center gap-1 bg-rose-200 text-rose-800 px-2 py-1 border-2 border-stone-900 text-sm font-bold">
                      <Ban className="w-3 h-3" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-green-200 text-green-800 px-2 py-1 border-2 border-stone-900 text-sm font-bold">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-stone-600">{formatDate(user.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => suspendMutation.mutate(user.id)}
                    disabled={suspendMutation.isPending || user.role === 'admin'}
                    className={
                      user.suspendedAt
                        ? 'text-green-700 hover:text-green-800 hover:bg-green-100 border-2 border-stone-900'
                        : 'text-rose-700 hover:text-rose-800 hover:bg-rose-100 border-2 border-stone-900'
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
    <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-100 border-b-4 border-stone-900">
            <tr>
              <th className="text-left p-4 font-bold text-stone-900">Game</th>
              <th className="text-left p-4 font-bold text-stone-900">User</th>
              <th className="text-left p-4 font-bold text-stone-900">Rating</th>
              <th className="text-left p-4 font-bold text-stone-900">Review</th>
              <th className="text-left p-4 font-bold text-stone-900">Date</th>
              <th className="text-right p-4 font-bold text-stone-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.reviews.map((review: AdminReview) => (
              <tr key={review.id} className="border-b-2 border-stone-200 hover:bg-stone-50">
                <td className="p-4 font-bold text-stone-900 max-w-[150px] truncate">
                  {review.gameName}
                </td>
                <td className="p-4">
                  <div className="text-sm text-stone-600">@{review.username}</div>
                </td>
                <td className="p-4">
                  <span className="bg-amber-200 text-amber-900 px-2 py-1 border-2 border-stone-900 text-sm font-bold">
                    {review.rating}/5
                  </span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <p className="text-sm text-stone-600 truncate">
                    {review.reviewText || <span className="italic">No text</span>}
                  </p>
                </td>
                <td className="p-4 text-sm text-stone-600">{formatDate(review.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(review.id)}
                    disabled={deleteMutation.isPending}
                    className="text-rose-700 hover:text-rose-800 hover:bg-rose-100 border-2 border-stone-900"
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
        return 'bg-amber-200 text-amber-800'
      default:
        return 'bg-stone-200 text-stone-800'
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
    <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] overflow-hidden">
      {data.logs.length === 0 ? (
        <div className="p-8 text-center">
          <ScrollText className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600">No audit logs yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y-2 divide-stone-200">
            {data.logs.map((log: AuditLog) => (
              <div key={log.id} className="p-4 hover:bg-stone-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-1 border-2 border-stone-900 text-xs font-bold ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-sm text-stone-600">
                        by <span className="font-bold">@{log.adminUsername}</span>
                      </span>
                    </div>
                    {log.details && (
                      <div className="text-sm text-stone-600 mt-1">
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
                  <div className="flex items-center gap-1 text-xs text-stone-500 shrink-0">
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
    <div className="flex items-center justify-between p-4 border-t-4 border-stone-900 bg-stone-100">
      <div className="text-sm text-stone-600">
        Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount}
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] hover:shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold text-stone-900">
          {currentPage} / {totalPages || 1}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={!hasMore}
          className="border-4 border-stone-900 shadow-[3px_3px_0px_0px_rgba(41,37,36,1)] hover:shadow-[1px_1px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
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

  if (isLoading) {
    return <LoadingCard />
  }

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Moon className="w-6 h-6 text-stone-900" />
          <h3 className="text-lg font-bold text-stone-900">Appearance</h3>
        </div>

        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-50 border-4 border-stone-900">
            <div>
              <h4 className="font-bold text-stone-900">Dark Mode Toggle</h4>
              <p className="text-sm text-stone-600 mt-1">
                Allow users to switch between light and dark themes
              </p>
            </div>
            <Button
              onClick={handleToggle}
              disabled={isSaving}
              className={`relative w-14 h-8 border-4 border-stone-900 transition-colors ${
                settings.darkModeEnabled ? 'bg-green-400' : 'bg-stone-300'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={settings.darkModeEnabled ? 'Disable dark mode' : 'Enable dark mode'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white border-2 border-stone-900 transition-transform ${
                  settings.darkModeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </Button>
          </div>

          {/* Status indicator */}
          <div className="text-sm text-stone-600">
            Status:{' '}
            <span className={`font-bold ${settings.darkModeEnabled ? 'text-green-700' : 'text-stone-500'}`}>
              {settings.darkModeEnabled ? 'Enabled' : 'Disabled'}
            </span>
            {' '}- Users {settings.darkModeEnabled ? 'can' : 'cannot'} see the theme toggle button
          </div>
        </div>
      </div>

      {/* Featured Games */}
      <FeaturedGamesPicker />

      {/* Info Card */}
      <div className="bg-sky-100 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-stone-900 mt-0.5" />
          <div>
            <h4 className="font-bold text-stone-900">About Settings</h4>
            <p className="text-sm text-stone-700 mt-1">
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
    <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-6 h-6 text-stone-900" />
        <h3 className="text-lg font-bold text-stone-900">Featured Games</h3>
      </div>

      <p className="text-sm text-stone-600 mb-4">
        Select and order the games that appear in the "Featured games" section on the homepage.
        If no games are selected, the top-rated games by IGDB rating will be shown instead.
      </p>

      {/* Search Input */}
      <div className="relative mb-4" ref={dropdownRef}>
        <div className="flex items-center gap-2 border-4 border-stone-900 bg-stone-50 px-3 py-2">
          <Search className="w-4 h-4 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games to add..."
            className="flex-1 bg-transparent outline-none text-sm text-stone-900 placeholder:text-stone-400"
          />
          {isSearching && (
            <div className="animate-spin h-4 w-4 border-2 border-stone-900 border-t-transparent rounded-full" />
          )}
        </div>

        {/* Search Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] max-h-60 overflow-y-auto">
            {searchResults.map((game) => (
              <button
                key={game.id}
                onClick={() => addGame(game)}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-stone-100 text-left border-b border-stone-200 last:border-b-0"
              >
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-8 h-10 object-cover border-2 border-stone-900"
                  />
                ) : (
                  <div className="w-8 h-10 bg-stone-200 border-2 border-stone-900" />
                )}
                <span className="text-sm font-bold text-stone-900 truncate">{game.name}</span>
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
              className="flex items-center gap-3 p-2 bg-stone-50 border-4 border-stone-900"
            >
              <span className="text-xs font-bold text-stone-500 w-6 text-center">{index + 1}</span>
              {game.coverUrl ? (
                <img
                  src={game.coverUrl}
                  alt={game.name}
                  className="w-8 h-10 object-cover border-2 border-stone-900"
                />
              ) : (
                <div className="w-8 h-10 bg-stone-200 border-2 border-stone-900" />
              )}
              <span className="flex-1 text-sm font-bold text-stone-900 truncate">{game.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveGame(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-stone-200 disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4 text-stone-900" />
                </button>
                <button
                  onClick={() => moveGame(index, 'down')}
                  disabled={index === selectedGames.length - 1}
                  className="p-1 hover:bg-stone-200 disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4 text-stone-900" />
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
        <div className="text-sm text-stone-500 italic mb-4 p-4 bg-stone-50 border-4 border-stone-900 text-center">
          No featured games selected. The homepage will show top-rated games by IGDB rating.
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-green-400 hover:bg-green-500 text-stone-900 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] hover:shadow-[2px_2px_0px_0px_rgba(41,37,36,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? 'Saving...' : 'Save Featured Games'}
      </Button>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="bg-white border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8">
      <div className="flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-stone-900 border-t-transparent"></div>
        <span className="ml-3 text-stone-900 font-bold">Loading...</span>
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-rose-200 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 text-center">
      <p className="text-rose-800 font-bold">{message}</p>
    </div>
  )
}
