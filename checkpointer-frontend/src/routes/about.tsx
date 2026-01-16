import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Button className="bg-yellow-200 p-10 border-4 border-red-500">Hello "/about"!</Button>
}
