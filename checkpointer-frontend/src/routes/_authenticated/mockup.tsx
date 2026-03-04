import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { dbUserQueryOptions } from '@/lib/api'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import CommunityAppMockup from '@/community-app-mockup'

export const Route = createFileRoute('/_authenticated/mockup')({
  component: MockupPage,
})

function MockupPage() {
  const navigate = useNavigate()
  const { data: dbUserData, isPending: isUserPending } = useQuery(dbUserQueryOptions)
  const isAdmin = dbUserData?.account?.role === 'admin'

  if (isUserPending) {
    return (
      <div className="min-h-screen bg-rose-50 dark:bg-background p-6">
        <Navbar />
        <div className="flex items-center justify-center mt-12">
          <div className="animate-spin h-8 w-8 border-4 border-stone-900 border-t-transparent"></div>
          <span className="ml-3 text-stone-900 dark:text-stone-100 font-bold">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-rose-50 dark:bg-background p-6">
        <Navbar />
        <div className="container mx-auto max-w-4xl mt-12">
          <div className="bg-rose-300 border-4 border-stone-900 shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] p-8 text-center">
            <Shield className="w-16 h-16 text-stone-900 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-stone-900 mb-2">Access Denied</h1>
            <p className="text-stone-900 mb-4">You don't have permission to view this page.</p>
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

  return <CommunityAppMockup />
}
