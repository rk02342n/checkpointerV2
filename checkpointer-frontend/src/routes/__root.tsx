import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

interface MyRouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function NavBar() {
  return (
    <div className="p-6 flex gap-8 text-lg text-left">
    <Link
      to="/"
      activeProps={{
        className: 'font-bold',
      }}
      activeOptions={{ exact: true }}
    >
      Home
    </Link>
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
  )
}

function RootComponent() {
  return (
    <>
    <NavBar/>
      <hr />
      <Outlet />
    </>
  )
}