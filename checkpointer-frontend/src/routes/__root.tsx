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

function Footer() {
  return(
    <footer className="border-4 border-border dark:bg-black bg-red-400 py-8 sm:py-12 mt-12 mx-4 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] dark:sm:shadow-[8px_8px_0px_0px_rgba(120,113,108,0.5)] mb-10">
        <div className="mx-auto px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground font-alt">Checkpointer © 2026</span>
          </div>
          <div className="flex gap-4 sm:gap-6 text-sm text-foreground/80 font-medium">
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{className: 'font-bold text-secondary-foreground'}}>About</Link>
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{className: 'font-bold text-secondary-foreground'}}>News</Link>
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{className: 'font-bold text-secondary-foreground'}}>Pro</Link>
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{className: 'font-bold text-secondary-foreground'}}>Apps</Link>
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{className: 'font-bold text-secondary-foreground'}}>API</Link>
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