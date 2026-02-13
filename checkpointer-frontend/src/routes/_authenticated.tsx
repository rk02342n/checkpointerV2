import { createFileRoute, Outlet } from '@tanstack/react-router'
import { userQueryOptions } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Gamepad2, LogIn, UserPlus, Star, Calendar } from 'lucide-react'
import Navbar from '@/components/Navbar'

const Login = () => {
    return (
        <div className="min-h-screen bg-amber-100 dark:bg-black p-6">
            <Navbar />
            <div className="container mx-auto max-w-2xl mt-12">
                {/* Hero Card */}
                <div 
                className="bg-cyan-200 dark:bg-blue-900/60 border-4 border-black dark:border-white rounded-none p-8 md:p-12 text-center shadow-lg">
                    {/* Logo/Icon */}
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-lime-200 border-4 border-black rounded-full mb-6">
                        <Gamepad2 className="w-10 h-10 text-black" />
                    </div>

                    {/* Branding */}
                    <h1 className="text-4xl md:text-5xl font-semibold text-foreground font-alt tracking-tight mb-2">
                        Checkpointer
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium mb-8">
                        Track your games. Share your thoughts.
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-black/20">
                            <Star className="w-4 h-4 text-black fill-amber-300" />
                            <span className="text-sm font-medium text-black">Rate games</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-black/20">
                            <Gamepad2 className="w-4 h-4 text-black fill-lime-500" />
                            <span className="text-sm font-medium text-black">Track progress</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-black/20">
                            <Calendar className="w-4 h-4 text-black fill-amber-200" />
                            <span className="text-sm font-medium text-black">Log your journey</span>
                        </div>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            asChild
                            className="bg-lime-200 hover:bg-lime-400 dark:bg-lime-800 dark:hover:bg-lime-600 text-foreground border-2 border-border font-bold px-8 py-6 text-lg"
                        >
                            <a href="/api/login" className="flex items-center gap-2">
                                <LogIn className="w-5 h-5" />
                                Login
                            </a>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="bg-background hover:bg-blue-400/40 text-foreground border-2 border-black font-bold px-8 py-6 text-lg"
                        >
                            <a href="/api/register" className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5" />
                                Create Account
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Bottom text */}
                <p className="text-center text-black/60 text-sm mt-6">
                    Join the community of gamers sharing their experiences
                </p>
            </div>
        </div>
    )
}

const Component = () => {
    const { user } = Route.useRouteContext();
    if (!user) {
      return <Login />
    }

    return <Outlet />
  };

// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
    beforeLoad: async ({ context }) => {
        try { const queryClient = context.queryClient
        const data = await queryClient.fetchQuery(userQueryOptions)
        return data } catch (e) {
          return { user: null};
        }
      },
    component: Component
  })