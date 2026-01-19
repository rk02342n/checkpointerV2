import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'
import { createExpenseSchema } from '../../../../server/sharedTypes' 
import { getAllExpensesQueryOptions, createExpense, loadingCreateExpenseQueryOptions} from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/create-expense')({
  component: CreateExpense,
})

function CreateExpense() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: new Date().toISOString()
    },
    onSubmit: async ({ value }) => {
      const existingExpenses = await queryClient.ensureQueryData(
        getAllExpensesQueryOptions
      ); // grab the existing expenses locally or from server if not on memory
      navigate({to: '/expenses'});

      // Loading state
      toast.loading("creating expense");
      queryClient.setQueryData(loadingCreateExpenseQueryOptions.queryKey, {expense: value})

      try{
        const newExpense = await createExpense({ value });
        queryClient.setQueryData(getAllExpensesQueryOptions.queryKey, {
          ...existingExpenses,
          expenses: [newExpense, ...(existingExpenses.expenses || [])],
        }); // update local cache to include new expense that was just created
        // success state
        toast.dismiss();
        toast.success(`Expense has been added: ID: ${newExpense.id}`)
      } catch(error){
        // handle error state
        toast.error("Failed to create new expense")
      } finally{
        queryClient.setQueryData(loadingCreateExpenseQueryOptions.queryKey, {})
      }
    },
  })

  return (<div className='m-auto p-4 max-w-lg'>
    <h2 className="text-xl font-semibold tracking-tight p-4 text-center">Create expense</h2>
    <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className='flex flex-col gap-4'
      >
        <form.Field
            name="title"
            validators={{
              onChange: createExpenseSchema.shape.title
            }}
            children={(field) => (
              <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                </div>
                <>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <p className='text-red-600 text-sm'>
                      {field.state.meta.errors.map((err: any) => 
                        typeof err === 'string'
                          ? err
                          : err && err.message 
                            ? err.message 
                            : JSON.stringify(err)
                      ).join(',')}
                    </p>
                  ) : null}
                  {field.state.meta.isValidating ? 'Validating...' : null}
                </>
              </>
            )}
          />

          <form.Field
            name="amount"
            validators={{
              onChange: createExpenseSchema.shape.amount
            }}
            children={(field) => (
              <>
                <div className='flex flex-col gap-2'>
                <Label htmlFor={field.name}>Amount</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  type='number'
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                </div>
                <>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <p className='text-red-600 text-sm'>
                    {field.state.meta.errors.map((err: any) => 
                      typeof err === 'string'
                        ? err
                        : err && err.message 
                          ? err.message 
                          : JSON.stringify(err)
                    ).join(',')}
                  </p>
                  ) : null}
                  {field.state.meta.isValidating ? 'Validating...' : null}
                </>
              </>
            )}
          />
          <form.Field
            name="date"
            // validators={{
            //   onChange: ({ value }) => createExpenseSchema.shape.date.safeParse(value),
            // }}
            children={(field) => (
              <>
                <div className='self-center'>
                <Calendar
                  mode="single"
                  required
                  className="max-w-xs border rounded-md outline-none"
                  selected={field.state.value ? new Date(field.state.value) : undefined}
                  onSelect={(date) =>
                    field.handleChange(date ? date.toISOString() : '')
                  }
                />
                </div>
                {/* <>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <p className='text-red-600 text-sm'>
                    {field.state.meta.errors.map((err: any) => 
                      typeof err === 'string'
                        ? err
                        : err && err.message 
                          ? err.message 
                          : JSON.stringify(err)
                    ).join(',')}
                  </p>
                  ) : null}
                  {field.state.meta.isValidating ? 'Validating...' : null}
                </> */}
              </>
            )}
          />
          <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <>
            <div className='flex flex-row gap-2 justify-center'>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? '...' : 'Submit'}
              </Button>
              <Button
                type="reset"
                onClick={(e) => {
                  // Avoid unexpected resets of form elements (especially <select> elements)
                  e.preventDefault()
                  form.reset()
                }}
              >
                Reset
              </Button>
              </div>
            </>
          )}
        /> 
    </form>
  </div>)
}
