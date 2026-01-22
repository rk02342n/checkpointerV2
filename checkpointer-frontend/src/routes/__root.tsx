import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Toaster } from "@/components/ui/sonner"
import { Gamepad } from 'lucide-react'

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
        to="/checkpoint"
        activeProps={{
          className: 'font-bold text-4xl',
        }}
        activeOptions={{ exact: true }}
      >
        <h1 className='text-xl font-bold font-serif'>Checkpointer V2</h1>
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
        to="/create-expense"
        activeProps={{
          className: 'font-bold',
        }}>
          Create Post
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

function Footer() {
  return(
    <footer className="border-4 border-foreground bg-background py-12 mt-12 mb-4 mx-4 rounded-md">
        <div className="mx-auto px-12 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Gamepad className="w-6 h-6 text-zinc-600" />
            <span className="font-bold text-primary">Checkpointer © 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link to="/about" activeProps={{className: 'font-bold'}}>About</Link>
            <Link to="/about" activeProps={{className: 'font-bold'}}>News</Link>
            <Link to="/about" activeProps={{className: 'font-bold'}}>Pro</Link>
            <Link to="/about" activeProps={{className: 'font-bold'}}>Apps</Link>
            <Link to="/about" activeProps={{className: 'font-bold'}}>API</Link>
          </div>
        </div>
      </footer>
  )
}

function RootComponent() {
  return (
    <>
    <NavBar/>
      <hr />
      <Outlet />
      <Toaster/>
      <Footer/>
    </>
  )
}