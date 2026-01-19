import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return <h2 className="m-auto mt-10 p-10 border-4 text-center font-bold font-serif max-w-md rounded-xl">About us</h2>
}
