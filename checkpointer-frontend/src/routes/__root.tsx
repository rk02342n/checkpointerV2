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

function Footer() {
  return(
    <footer className="border-4 border-stone-900 bg-sky-300 py-8 sm:py-12 mt-12 mx-4 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] mb-10">
        <div className="mx-auto px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Gamepad className="w-6 h-6 text-stone-900" />
            <span className="font-bold text-stone-900">Checkpointer © 2026</span>
          </div>
          <div className="flex gap-4 sm:gap-6 text-sm text-stone-700 font-medium">
            <Link to="/about" className="hover:text-amber-800 transition-colors" activeProps={{className: 'font-bold text-black'}}>About</Link>
            <Link to="/about" className="hover:text-amber-800 transition-colors" activeProps={{className: 'font-bold text-black'}}>News</Link>
            <Link to="/about" className="hover:text-amber-800 transition-colors" activeProps={{className: 'font-bold text-black'}}>Pro</Link>
            <Link to="/about" className="hover:text-amber-800 transition-colors" activeProps={{className: 'font-bold text-black'}}>Apps</Link>
            <Link to="/about" className="hover:text-amber-800 transition-colors" activeProps={{className: 'font-bold text-black'}}>API</Link>
          </div>
        </div>
      </footer>
  )
}

function RootComponent() {
  return (
    <>
      <hr />
      <Outlet />
      <Toaster/>
      <Footer/>
    </>
  )
}