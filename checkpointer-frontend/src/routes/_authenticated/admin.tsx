import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbUserQueryOptions } from '@/lib/api'
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
} from 'lucide-react'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminDashboard,
})

type Tab = 'stats' | 'users' | 'reviews' | 'audit'

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
      <div className="min-h-screen bg-zinc-900 p-6">
        <Navbar />
        <div className="container mx-auto max-w-4xl mt-12">
          <div className="bg-rose-500 border-2 border-black rounded-xl p-8 text-center">
            <Shield className="w-16 h-16 text-black mx-auto mb-4" />
            <h1 className="text-2xl font-black text-black mb-2">Access Denied</h1>
            <p className="text-black mb-4">You don't have permission to access the admin dashboard.</p>
            <Button
              onClick={() => navigate({ to: '/' })}
              className="bg-white hover:bg-zinc-100 text-black border-2 border-black font-bold"
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
  ]

  return (
    <div className="min-h-screen bg-zinc-800 p-6">
      <Navbar />

      <div className="container mx-auto max-w-6xl mt-6">
        {/* Header */}
        <div className="bg-amber-400 border-2 border-black rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-black" />
            <h1 className="text-3xl font-black text-black font-serif">Admin Dashboard</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-black font-bold text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-400 text-black'
                  : 'bg-white text-black hover:bg-zinc-100'
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Users Stats */}
      <div className="bg-sky-300 border-2 border-black rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-black" />
          <h3 className="text-lg font-bold text-black">Users</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-black">Total</span>
            <span className="font-bold text-black">{stats.users.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black">Suspended</span>
            <span className="font-bold text-rose-600">{stats.users.suspended}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black">New (7 days)</span>
            <span className="font-bold text-green-600">{stats.users.newLast7Days}</span>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="bg-lime-300 border-2 border-black rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserCog className="w-6 h-6 text-black" />
          <h3 className="text-lg font-bold text-black">Roles</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.users.byRole).map(([role, count]) => (
            <div key={role} className="flex justify-between">
              <span className="text-black capitalize">{role}</span>
              <span className="font-bold text-black">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Stats */}
      <div className="bg-amber-300 border-2 border-black rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-black" />
          <h3 className="text-lg font-bold text-black">Reviews</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-black">Total</span>
            <span className="font-bold text-black">{stats.reviews.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black">Avg Rating</span>
            <span className="font-bold text-black">
              {stats.reviews.averageRating ? `${stats.reviews.averageRating}/5` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Games Stats */}
      <div className="bg-rose-300 border-2 border-black rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-black" />
          <h3 className="text-lg font-bold text-black">Games</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-black">Total in DB</span>
            <span className="font-bold text-black">{stats.games.total}</span>
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
    <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-100 border-b-2 border-black">
            <tr>
              <th className="text-left p-4 font-bold text-black">User</th>
              <th className="text-left p-4 font-bold text-black">Role</th>
              <th className="text-left p-4 font-bold text-black">Status</th>
              <th className="text-left p-4 font-bold text-black">Joined</th>
              <th className="text-right p-4 font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user: AdminUser) => (
              <tr key={user.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                <td className="p-4">
                  <div>
                    <div className="font-bold text-black">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-sm text-zinc-500">@{user.username}</div>
                  </div>
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
                    className="bg-white border-2 border-black rounded px-2 py-1 text-sm font-bold"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  {user.suspendedAt ? (
                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded text-sm font-bold">
                      <Ban className="w-3 h-3" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-zinc-600">{formatDate(user.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => suspendMutation.mutate(user.id)}
                    disabled={suspendMutation.isPending || user.role === 'admin'}
                    className={
                      user.suspendedAt
                        ? 'text-green-600 hover:text-green-700 hover:bg-green-100'
                        : 'text-rose-600 hover:text-rose-700 hover:bg-rose-100'
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
    <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-100 border-b-2 border-black">
            <tr>
              <th className="text-left p-4 font-bold text-black">Game</th>
              <th className="text-left p-4 font-bold text-black">User</th>
              <th className="text-left p-4 font-bold text-black">Rating</th>
              <th className="text-left p-4 font-bold text-black">Review</th>
              <th className="text-left p-4 font-bold text-black">Date</th>
              <th className="text-right p-4 font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.reviews.map((review: AdminReview) => (
              <tr key={review.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                <td className="p-4 font-bold text-black max-w-[150px] truncate">
                  {review.gameName}
                </td>
                <td className="p-4">
                  <div className="text-sm text-zinc-600">@{review.username}</div>
                </td>
                <td className="p-4">
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-bold">
                    {review.rating}/5
                  </span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <p className="text-sm text-zinc-600 truncate">
                    {review.reviewText || <span className="italic">No text</span>}
                  </p>
                </td>
                <td className="p-4 text-sm text-zinc-600">{formatDate(review.createdAt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(review.id)}
                    disabled={deleteMutation.isPending}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
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
        return 'bg-rose-100 text-rose-700'
      case 'UNSUSPEND_USER':
        return 'bg-green-100 text-green-700'
      case 'UPDATE_USER_ROLE':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-zinc-100 text-zinc-700'
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
    <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
      {data.logs.length === 0 ? (
        <div className="p-8 text-center">
          <ScrollText className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600">No audit logs yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-zinc-200">
            {data.logs.map((log: AuditLog) => (
              <div key={log.id} className="p-4 hover:bg-zinc-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-sm text-zinc-600">
                        by <span className="font-bold">@{log.adminUsername}</span>
                      </span>
                    </div>
                    {log.details && (
                      <div className="text-sm text-zinc-600 mt-1">
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
                  <div className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
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
    <div className="flex items-center justify-between p-4 border-t-2 border-black bg-zinc-50">
      <div className="text-sm text-zinc-600">
        Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="border-2 border-black"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold">
          {currentPage} / {totalPages || 1}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={!hasMore}
          className="border-2 border-black"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="bg-white border-2 border-black rounded-xl p-8">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        <span className="ml-3 text-black font-bold">Loading...</span>
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-rose-100 border-2 border-black rounded-xl p-8 text-center">
      <p className="text-rose-700 font-bold">{message}</p>
    </div>
  )
}
