import { Link, Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function NavBar() {
  return (
    <div className="p-2 flex gap-2 text-lg">
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