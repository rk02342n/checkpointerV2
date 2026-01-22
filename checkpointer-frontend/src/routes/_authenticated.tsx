import { createFileRoute, Outlet } from '@tanstack/react-router'
import { userQueryOptions } from '@/lib/api'
import { Button } from '@/components/ui/button'


const Login = () => {
    return (

        <div className='flex flex-col max-w-xl gap-4 m-auto'><h2 className='text-center'>You have to log in sir!</h2>
          <Button asChild className='bg-amber-400'>
            <a href="/api/login">Login</a>
          </Button>
          <Button asChild className='bg-amber-400'>
            <a href="/api/register">Register</a>
          </Button>
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