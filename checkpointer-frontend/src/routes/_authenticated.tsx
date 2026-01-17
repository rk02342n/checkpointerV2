import { createFileRoute, Outlet } from '@tanstack/react-router'
import { userQueryOptions } from '@/lib/api'
import { Button } from '@/components/ui/button'


const Login = () => {
    return (

        <div className='flex flex-col m-8'><h2>You have to log in sir!</h2>
          <Button className='p-4 m-8 max-w-20 justify-start' onClick={() => { window.location.href = '/api/login' }}>
            Login
          </Button>
        </div>
    )
}

const Component = () => {
    const { user } = Route.useRouteContext() ;
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