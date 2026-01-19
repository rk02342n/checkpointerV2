import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Toaster } from "@/components/ui/sonner"

interface MyRouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function NavBar() {
  return (
    <div className='flex justify-between p-6 items-center'>
      <Link
        to="/"
        activeProps={{
          className: 'font-bold',
        }}
        activeOptions={{ exact: true }}
      >
        <h1 className='font-mono'> Checkpointer V2</h1>
      </Link>
      <div className="flex gap-8 text-lg text-left">
      <Link
        to="/about"
        activeProps={{
          className: 'font-bold',
        }}
      >
        About
      </Link>
      <Link
        to="/expenses"
        activeProps={{
          className: 'font-bold',
        }}>
          Expenses
      </Link>
      <Link
        to="/create-expense"
        activeProps={{
          className: 'font-bold',
        }}>
          Create Expense
      </Link>
      <Link
        to="/profile"
        activeProps={{
          className: 'font-bold',
        }}>
          Profile
      </Link>
    </div>
  </div>
  )
}

function RootComponent() {
  return (
    <>
    <NavBar/>
      <hr />
      <Outlet />
      <Toaster/>
    </>
  )
}