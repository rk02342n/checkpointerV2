import { createFileRoute } from '@tanstack/react-router'
// import { api } from '@/lib/api'; //hono-client error
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute('/_authenticated/expenses')({
  component: Expenses,
})

type Expense = {
    id: number,
    title: string,
    amount: number,
}

async function getAllExpenses() {
  // await new Promise((r) => setTimeout(r, 2000)) // fake delay to test skeleton
  const res = await fetch("api/expenses")
  // client will let us do this instead - helps make everything typesafe
  // const res = await api.expenses.$get() // not working because of error caused by hono client
  if(!res.ok){
    throw new Error("Ummmm Server error");
  }
  const data = await res.json()
  return data
}

function Expenses() {
  // Queries
  const { isPending, error, data, isFetching } = useQuery({ queryKey: ['get-all-expenses'], queryFn: getAllExpenses }) // look at what query returns here - react query / tanstack query

  if (error) return 'An error has occurred: ' + error.message

  return(
    <div className='flex flex-col'>
    <Table className="gap-8 items-start p-10">
      <TableCaption className='m-4'>A list of all your expenses.</TableCaption>
      <TableHeader className='font-serif font-bold'>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
      {isPending || isFetching ?
        Array(3).fill(0).map((_, i) => (
          <TableRow key={i}>
              <TableCell><Skeleton className='h-4' /></TableCell>
              <TableCell><Skeleton className='h-4' /></TableCell>
              <TableCell><Skeleton className='h-4' /></TableCell>
            </TableRow>
        ))
      : 
        data?.expenses.map((expense: Expense) => (
          <TableRow key={expense.id}>
            <TableCell className="font-medium">{expense.id}</TableCell>
            <TableCell>{expense.title}</TableCell>
            <TableCell className="text-right">{expense.amount}</TableCell>
          </TableRow>
        ))
      }
      </TableBody>
    </Table>
    </div>
  )
}

