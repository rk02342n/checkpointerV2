import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({
  component: Index,
})

// import { api } from '@/lib/api'; //hono-client error

async function getTotalSpent() {
    const res = await fetch("api/expenses/total-spent")
    // client will let us do this instead - helps make everything typesafe
    // const res = await api.expenses["total-spent"].$get() // not working because of error caused by hono client
    if(!res.ok){
      throw new Error("Server error");
    }
    const data = await res.json()
    return data
}

function Index() {
    // Queries
  const { isPending, error, data, isFetching } = useQuery({ queryKey: ['get-total-spent'], queryFn: getTotalSpent }) // look at what query returns here - react query / tanstack query

  if (error) return 'An error has occurred: ' + error.message
  return (
    
    <Card className="w-[350px] m-auto">
      <CardHeader>
        <CardTitle>Total spent</CardTitle>
        <CardDescription>
          The total amount you've spent
        </CardDescription>
        <CardAction>
          {/* <CardContent className='text-black'>{totalSpent}</CardContent> */}
          <CardContent className='text-black'>{isPending ? "Loading..." : data.total}</CardContent>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
