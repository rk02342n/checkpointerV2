import { createFileRoute } from '@tanstack/react-router'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/create-expense')({
  component: CreateExpense,
})

function CreateExpense() {
  return (<div className='m-auto p-4'>
    <h2>Create expense</h2>
    <form className='flex max-w-3xl gap-10 p-4'>
        <Label htmlFor="title">Title</Label>
        <Input id="title" type="text"placeholder='Title' />
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="text"placeholder='Amount' />
        <Button type="submit">Create Expense</Button> 
    </form>
  </div>)
}
