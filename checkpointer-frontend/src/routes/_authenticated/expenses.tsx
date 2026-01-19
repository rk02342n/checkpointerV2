import { createFileRoute } from '@tanstack/react-router'
// import { api } from '@/lib/api'; //hono-client error
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { deleteExpense, getAllExpensesQueryOptions, loadingCreateExpenseQueryOptions } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/expenses')({
  component: Expenses,
})

type Expense = {
    id: number,
    title: string,
    amount: number,
    date: string
}

function Expenses() {
  // Queries
  const { isPending, error, data } = useQuery
  (getAllExpensesQueryOptions) // look at what query returns here - react query / tanstack query

  const {data: loadingCreateExpense} = useQuery(loadingCreateExpenseQueryOptions);


  if (error) return 'An error has occurred: ' + error.message

  return(
    <div className='flex m-auto max-w-2xl'>
    <Table className="gap-8 items-start p-10">
      <TableCaption className='m-4'>A list of all your expenses.</TableCaption>
      <TableHeader className='font-extrabold'>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className='text-center'>Date</TableHead>
          <TableHead className="text-right">Delete</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
      {loadingCreateExpense?.expense && <TableRow>
        <TableCell><Skeleton className='h-4' /></TableCell>
        <TableCell>{loadingCreateExpense?.expense.title}</TableCell>
        <TableCell className="text-left">{loadingCreateExpense?.expense.amount}</TableCell>
        <TableCell className='text-center'>{loadingCreateExpense?.expense.date.split("T")[0]}</TableCell>
        <TableCell><Skeleton className='h-4' /></TableCell>
      </TableRow>}
      {isPending ?
        Array(3).fill(0).map((_, i) => (
          <TableRow key={i}>
              <TableCell><Skeleton className='h-4' /></TableCell>
              <TableCell><Skeleton className='h-4' /></TableCell>
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
            <TableCell className="text-center">{expense.date.split("T")[0]}</TableCell>
            <TableCell className="text-right">
                <DeleteExpenseButton id={expense.id}/>
            </TableCell>
          </TableRow>
        ))
      }
      </TableBody>
    </Table>
    </div>
  )
}

function DeleteExpenseButton({id} : {id: number}){
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteExpense,
    onError: (error) => {
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success(`Sucessfully deleted expense: ${id}`)
      queryClient.setQueryData(getAllExpensesQueryOptions.queryKey, (existingExpenses: any) => ({
        ...existingExpenses,  
        expenses: existingExpenses!.expenses.filter((e: { id: number; }) => e.id != id),
      })); // update local cache to exclude new expense that was just deleted
    },
  })
  return(
    <Button
      size="icon"
      aria-label="Delete"
      className='rounded-full outline-none'
      onClick={() => mutation.mutate({ id })}
      disabled={mutation.isPending}
      >
      {mutation.isPending ? "..." : <Trash2 /> }
    </Button>
  )
}